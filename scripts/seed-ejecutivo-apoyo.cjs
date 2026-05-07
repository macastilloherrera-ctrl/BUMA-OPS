#!/usr/bin/env node
"use strict";

/**
 * Seed/actualiza permisos del rol "ejecutivo_apoyo" en la tabla
 * role_permissions_config (Neon prod). Mismos módulos que
 * ejecutivo_operaciones + dashboard_overview/dashboard_tickets/
 * dashboard_visitas habilitados, y buildingScope "all" porque es un
 * rol transversal que asiste a todos los ejecutivos.
 *
 * Idempotente: si la fila existe la actualiza, si no la inserta.
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/seed-ejecutivo-apoyo.cjs
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[seed-apoyo] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

// Igual que db-push-manual.cjs: forzar conexión directa (sin pooler) en
// memoria, sin tocar la DATABASE_URL del runtime.
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");

try {
  const u = new URL(directUrl);
  console.log(`[seed-apoyo] target: ${u.host}/${u.pathname.slice(1)} as ${u.username}`);
  if (process.env.DATABASE_URL.includes("-pooler.")) {
    console.log("[seed-apoyo] note: original URL apuntaba al pooler; usando endpoint directo");
  }
} catch {
  console.error("[seed-apoyo] DATABASE_URL malformada");
  process.exit(1);
}

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const ROLE = "ejecutivo_apoyo";
const HOME_ROUTE = "/visitas?view=today";
const BUILDING_SCOPE = "all";

// Módulos: clonar exactamente lo que tiene ejecutivo_operaciones en
// shared/modulePermissions.ts y forzar dashboard_* a true.
const MODULES = {
  panel_super_admin: false,
  dashboard_overview: true,
  dashboard_tickets: true,
  dashboard_visitas: true,
  calendario: true,
  visitas: true,
  tickets: true,
  edificios: true,
  equipos_criticos: true,
  proyectos: true,
  conciliacion_bancaria: false,
  cierre_mensual: false,
  ingresos: false,
  egresos: false,
  consumos_recurrentes: false,
  historial_pagos: true,
  consulta_operacional: true,
  verificacion_ggcc: true,
  mantenedores: false,
  ejecutivos: false,
  admin_usuarios: false,
  reportes_visitas: false,
  reportes_tickets: false,
  reportes_financiero: false,
  reportes_equipos: false,
  reportes_ejecutivos: false,
  reportes_egresos: false,
  estado_documental: true,
  ver_costos: false,
  aprobar_equipos: false,
  monitoreo_chat_ia: false,
  cumplimiento_legal: false,
  repositorio_documentos: false,
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");

    const meta = await client.query(
      `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema`,
    );
    console.log(
      `[seed-apoyo] connected: db=${meta.rows[0].db} user=${meta.rows[0].usr} schema=${meta.rows[0].schema}`,
    );

    // Sanity check: la tabla debe existir.
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='role_permissions_config'`,
    );
    if (tableCheck.rows.length === 0) {
      console.error(
        "[seed-apoyo] FATAL: tabla role_permissions_config no existe. " +
          "Corré scripts/db-push-manual.cjs primero o verifica la base.",
      );
      process.exit(2);
    }

    // ¿Existe ya la fila?
    const existing = await client.query(
      `SELECT role, modules, home_route, building_scope, updated_at
         FROM role_permissions_config WHERE role = $1`,
      [ROLE],
    );

    const modulesJson = JSON.stringify(MODULES);
    const updatedBy = "seed-script";

    if (existing.rows.length > 0) {
      const before = existing.rows[0];
      let prevModules = {};
      try {
        prevModules = JSON.parse(before.modules);
      } catch {}
      console.log(
        `[seed-apoyo] fila existente encontrada (updated_at=${before.updated_at?.toISOString?.() || before.updated_at})`,
      );
      console.log(
        `  home_route prev: ${before.home_route}  →  ${HOME_ROUTE}`,
      );
      console.log(
        `  building_scope prev: ${before.building_scope}  →  ${BUILDING_SCOPE}`,
      );
      const diff = [];
      for (const k of Object.keys(MODULES)) {
        if (prevModules[k] !== MODULES[k]) {
          diff.push(`${k}: ${prevModules[k]} → ${MODULES[k]}`);
        }
      }
      if (diff.length === 0) {
        console.log("  módulos: sin cambios");
      } else {
        console.log(`  módulos cambiados (${diff.length}):`);
        diff.forEach((d) => console.log(`    - ${d}`));
      }

      await client.query(
        `UPDATE role_permissions_config
            SET modules = $2,
                home_route = $3,
                building_scope = $4,
                updated_at = NOW(),
                updated_by = $5
          WHERE role = $1`,
        [ROLE, modulesJson, HOME_ROUTE, BUILDING_SCOPE, updatedBy],
      );
      console.log(`[seed-apoyo] ✅ UPDATE ejecutado para role='${ROLE}'`);
    } else {
      console.log(`[seed-apoyo] no existe fila para '${ROLE}', insertando…`);
      await client.query(
        `INSERT INTO role_permissions_config
           (role, modules, home_route, building_scope, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [ROLE, modulesJson, HOME_ROUTE, BUILDING_SCOPE, updatedBy],
      );
      console.log(`[seed-apoyo] ✅ INSERT ejecutado para role='${ROLE}'`);
    }

    // Re-leer para confirmar
    const after = await client.query(
      `SELECT role, home_route, building_scope, updated_at, updated_by
         FROM role_permissions_config WHERE role = $1`,
      [ROLE],
    );
    console.log("[seed-apoyo] fila final:");
    console.table(after.rows);

    const stored = await client.query(
      `SELECT modules FROM role_permissions_config WHERE role = $1`,
      [ROLE],
    );
    const parsed = JSON.parse(stored.rows[0].modules);
    const enabled = Object.entries(parsed).filter(([, v]) => v).map(([k]) => k);
    const disabled = Object.entries(parsed).filter(([, v]) => !v).map(([k]) => k);
    console.log(`[seed-apoyo] módulos habilitados (${enabled.length}): ${enabled.join(", ")}`);
    console.log(`[seed-apoyo] módulos deshabilitados (${disabled.length}): ${disabled.join(", ")}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[seed-apoyo] FATAL:", e.message || e);
  process.exit(1);
});
