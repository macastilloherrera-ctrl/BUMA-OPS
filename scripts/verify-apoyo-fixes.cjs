#!/usr/bin/env node
"use strict";

/**
 * Verifica los fixes del rol ejecutivo_apoyo del último commit:
 *  1. role_permissions_config tiene la fila correcta
 *  2. canAccessBuilding bypass en código
 *  3. Bloqueo a en_curso solo si hay cotizaciones sin aceptar
 *  4. assigned_executive_id resuelve a nombres reales (JOIN users)
 *  5. TypeScript compila (corrélo aparte: npx tsc --noEmit)
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/verify-apoyo-fixes.cjs
 *
 * Patrón de conexión y SET search_path como scripts/db-push-manual.cjs.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  console.error("[verify-apoyo] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const REQUIRED_TRUE = ["visitas", "tickets", "dashboard_tickets", "dashboard_visitas"];

async function check1Permisos(client) {
  console.log("\n=== 1. Permisos en DB (role_permissions_config / ejecutivo_apoyo) ===");
  const r = await client.query(
    `SELECT role, modules, home_route, building_scope, updated_at, updated_by
       FROM role_permissions_config WHERE role = 'ejecutivo_apoyo'`,
  );
  if (r.rows.length === 0) {
    console.log("❌ No existe fila para 'ejecutivo_apoyo' en role_permissions_config.");
    console.log("   Corré: DATABASE_URL=... node scripts/seed-ejecutivo-apoyo.cjs");
    return { ok: false };
  }
  const row = r.rows[0];
  console.log(`  building_scope: ${row.building_scope}`);
  console.log(`  home_route:     ${row.home_route}`);
  console.log(`  updated_at:     ${row.updated_at?.toISOString?.() || row.updated_at}`);
  let modules = {};
  try {
    modules = JSON.parse(row.modules);
  } catch (e) {
    console.log("❌ modules no es JSON válido");
    return { ok: false };
  }

  const scopeOk = row.building_scope === "all";
  const moduleResults = REQUIRED_TRUE.map((k) => ({ key: k, ok: modules[k] === true }));
  for (const m of moduleResults) {
    console.log(`  módulo ${m.key.padEnd(22)} = ${modules[m.key]}  ${m.ok ? "✓" : "✗"}`);
  }
  const allModulesOk = moduleResults.every((m) => m.ok);
  console.log(`  building_scope === 'all': ${scopeOk ? "✓" : "✗"}`);
  return { ok: scopeOk && allModulesOk, scopeOk, moduleResults };
}

function check2BypassCanAccessBuilding() {
  console.log("\n=== 2. canAccessBuilding bypass para ejecutivo_apoyo ===");
  const file = path.join(__dirname, "..", "server", "routes.ts");
  const src = fs.readFileSync(file, "utf8");
  const startIdx = src.indexOf("async function canAccessBuilding(");
  if (startIdx === -1) {
    console.log("❌ canAccessBuilding no encontrada");
    return { ok: false };
  }
  // Tomar ~30 líneas desde la firma
  const block = src.slice(startIdx, startIdx + 800);
  console.log("  --- snippet ---");
  block.split("\n").slice(0, 14).forEach((l) => console.log("  " + l));
  console.log("  ---");
  const hasBypass =
    /profile\?\.role\s*===\s*['"]ejecutivo_apoyo['"]\s*\)\s*return\s+true/.test(block);
  console.log(`  bypass detectado: ${hasBypass ? "✓" : "✗"}`);

  // También verificar canAccessEntity
  const entIdx = src.indexOf("async function canAccessEntity(");
  const entBlock = src.slice(entIdx, entIdx + 1200);
  const hasEntityBypass =
    /profile\?\.role\s*===\s*['"]ejecutivo_apoyo['"]\s*\)\s*return\s+true/.test(entBlock);
  console.log(`  canAccessEntity también con bypass: ${hasEntityBypass ? "✓" : "✗"}`);
  return { ok: hasBypass && hasEntityBypass };
}

function check3EnCursoSinCotizacion() {
  console.log("\n=== 3. en_curso permite ticket sin cotizaciones ===");
  const file = path.join(__dirname, "..", "server", "routes.ts");
  const src = fs.readFileSync(file, "utf8");
  // Buscar el bloque que maneja transición a 'en_curso'
  const idx = src.indexOf('target === "en_curso"');
  if (idx === -1) {
    console.log("❌ No encontré la transición a en_curso");
    return { ok: false };
  }
  const block = src.slice(idx, idx + 800);
  console.log("  --- snippet ---");
  block.split("\n").slice(0, 14).forEach((l) => console.log("  " + l));
  console.log("  ---");
  // El fix correcto: getTicketQuotes + if (quotes.length > 0) { ... hasApproved ... }
  const hasGuard = /if\s*\(\s*quotes\.length\s*>\s*0\s*\)/.test(block);
  const hasApprovedCheck = /hasApproved/.test(block);
  console.log(`  guarda 'if (quotes.length > 0)': ${hasGuard ? "✓" : "✗"}`);
  console.log(`  chequea hasApproved adentro:    ${hasApprovedCheck ? "✓" : "✗"}`);
  return { ok: hasGuard && hasApprovedCheck };
}

async function check4NombresEjecutivos(client) {
  console.log("\n=== 4. Nombres de ejecutivos resuelven (tickets ⨝ users) ===");
  const totals = await client.query(
    `SELECT
        COUNT(*) FILTER (WHERE t.assigned_executive_id IS NOT NULL) AS total_assigned,
        COUNT(*) FILTER (WHERE t.assigned_executive_id IS NOT NULL AND u.id IS NULL) AS orphan,
        COUNT(*) FILTER (WHERE t.assigned_executive_id IS NOT NULL AND u.id IS NOT NULL
                         AND COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) IS NOT NULL
                       ) AS with_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assigned_executive_id`,
  );
  const t = totals.rows[0];
  console.log(`  total tickets asignados: ${t.total_assigned}`);
  console.log(`  con nombre real:         ${t.with_name}`);
  console.log(`  huérfanos (no en users): ${t.orphan}`);

  const sample = await client.query(
    `SELECT t.id,
            t.assigned_executive_id AS exec_id,
            u.first_name,
            u.last_name,
            u.email,
            up.role
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assigned_executive_id
       LEFT JOIN user_profiles up ON up.user_id = t.assigned_executive_id
      WHERE t.assigned_executive_id IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT 8`,
  );
  console.log("  muestra:");
  for (const r of sample.rows) {
    const name = `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email || "-";
    const inDb = !!(r.first_name || r.last_name || r.email);
    console.log(
      `    ticket=${r.id.slice(0, 8)}…  exec=${r.exec_id.slice(0, 8)}…  ` +
        (inDb ? `nombre="${name}" rol=${r.role || "?"}` : "✗ no resuelve"),
    );
  }
  const total = parseInt(t.total_assigned, 10) || 0;
  const orphan = parseInt(t.orphan, 10) || 0;
  return { ok: total === 0 || orphan === 0, total, orphan };
}

async function main() {
  const checks = {};

  // Code-only checks (no necesitan DB)
  checks.bypass = check2BypassCanAccessBuilding();
  checks.enCurso = check3EnCursoSinCotizacion();

  // DB checks
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(`SELECT current_database() AS db, current_user AS u`);
    console.log(`[verify-apoyo] connected db=${meta.rows[0].db} user=${meta.rows[0].u}`);
    checks.permisos = await check1Permisos(client);
    checks.nombres = await check4NombresEjecutivos(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n=== RESUMEN ===");
  console.log(`1. Permisos en DB (apoyo):                ${checks.permisos.ok ? "✅" : "❌"}`);
  console.log(`2. canAccessBuilding bypass:              ${checks.bypass.ok ? "✅" : "❌"}`);
  console.log(`3. en_curso sin cotización:               ${checks.enCurso.ok ? "✅" : "❌"}`);
  console.log(`4. Nombres ejecutivos resuelven:          ${checks.nombres.ok ? "✅" : "❌"}`);
  console.log(`5. TypeScript:                            (correr 'npx tsc --noEmit')`);

  const allOk = Object.values(checks).every((c) => c.ok);
  if (!allOk) process.exit(2);
}

main().catch((e) => {
  console.error("[verify-apoyo] FATAL:", e);
  process.exit(1);
});
