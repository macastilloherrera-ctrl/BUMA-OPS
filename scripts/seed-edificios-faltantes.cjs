#!/usr/bin/env node
"use strict";

/**
 * Inserta en la tabla `buildings` (Neon prod) los edificios que faltan según
 * la matriz de responsabilidades de BUMA:
 *
 *   - La Aparición   → ejecutivo Rocío (ejecutivo_apoyo)
 *   - Tierra Buena   → ejecutivo Rocío (ejecutivo_apoyo)
 *   - El Golf III    → ejecutivo Matilda si existe en `users`; si no,
 *                      queda SIN asignar (assigned_executive_id = NULL)
 *
 * Idempotente: verifica por nombre (case-insensitive) antes de insertar, así
 * que correrlo varias veces no duplica edificios.
 *
 * `address` es NOT NULL en el esquema y no tenemos la dirección real todavía,
 * así que se inserta un placeholder explícito ("Dirección por completar") y se
 * loguea un aviso. La dirección se completa después desde el módulo Edificios.
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/seed-edificios-faltantes.cjs
 */

const { Pool } = require("pg");

// Regla 1 (calidad BUMA): validar env vars al inicio, error accionable.
if (!process.env.DATABASE_URL) {
  console.error(
    "[seed-edificios] FATAL: falta configurar DATABASE_URL (env var no seteada)",
  );
  process.exit(1);
}

// Igual que seed-ejecutivo-apoyo.cjs: forzar conexión directa (sin pooler) en
// memoria, sin tocar la DATABASE_URL del runtime.
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");

try {
  const u = new URL(directUrl);
  console.log(
    `[seed-edificios] target: ${u.host}/${u.pathname.slice(1)} as ${u.username}`,
  );
  if (process.env.DATABASE_URL.includes("-pooler.")) {
    console.log(
      "[seed-edificios] note: original URL apuntaba al pooler; usando endpoint directo",
    );
  }
} catch {
  console.error("[seed-edificios] FATAL: DATABASE_URL malformada");
  process.exit(1);
}

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

// ID de Rocío (ejecutivo_apoyo) provisto por el usuario.
const ROCIO_ID = "7ede3392-c983-4598-b336-1f4f10377fb5";
const PLACEHOLDER_ADDRESS = "Dirección por completar";

/**
 * Busca un usuario cuyo nombre/username coincida (case-insensitive) con el
 * término dado. Devuelve el id o null.
 */
async function findUserId(client, term) {
  const res = await client.query(
    `SELECT id, first_name, last_name, username, email
       FROM users
      WHERE first_name ILIKE $1
         OR username ILIKE $1
         OR email ILIKE $1
      LIMIT 1`,
    [`%${term}%`],
  );
  return res.rows[0] || null;
}

/**
 * Inserta un edificio si no existe (match por name case-insensitive).
 * Devuelve { action: "inserted"|"skipped", id }.
 */
async function upsertBuilding(client, { name, assignedExecutiveId }) {
  const existing = await client.query(
    `SELECT id, assigned_executive_id FROM buildings WHERE name ILIKE $1 LIMIT 1`,
    [name],
  );
  if (existing.rows.length > 0) {
    console.log(
      `[seed-edificios] "${name}" ya existe (id=${existing.rows[0].id}) → skip`,
    );
    return { action: "skipped", id: existing.rows[0].id };
  }

  const inserted = await client.query(
    `INSERT INTO buildings (name, address, status, assigned_executive_id)
     VALUES ($1, $2, 'activo', $3)
     RETURNING id`,
    [name, PLACEHOLDER_ADDRESS, assignedExecutiveId],
  );
  console.log(
    `[seed-edificios] ✅ "${name}" insertado (id=${inserted.rows[0].id}, ejecutivo=${assignedExecutiveId || "SIN ASIGNAR"})`,
  );
  return { action: "inserted", id: inserted.rows[0].id };
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");

    const meta = await client.query(
      `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema`,
    );
    console.log(
      `[seed-edificios] connected: db=${meta.rows[0].db} user=${meta.rows[0].usr} schema=${meta.rows[0].schema}`,
    );

    // Sanity check: la tabla debe existir.
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='buildings'`,
    );
    if (tableCheck.rows.length === 0) {
      console.error(
        "[seed-edificios] FATAL: tabla buildings no existe. Verifica la base o corré db:push.",
      );
      process.exit(2);
    }

    // Verificar que Rocío existe (aviso, no fatal).
    const rocio = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE id = $1`,
      [ROCIO_ID],
    );
    if (rocio.rows.length === 0) {
      console.warn(
        `[seed-edificios] AVISO: no se encontró usuario Rocío con id=${ROCIO_ID}. ` +
          "Se insertan igual con ese id; verificá que sea correcto en la tabla users.",
      );
    } else {
      const r = rocio.rows[0];
      console.log(
        `[seed-edificios] Rocío OK: ${r.first_name || ""} ${r.last_name || ""}`.trim() +
          ` (id=${r.id})`,
      );
    }

    // Verificar si existe Matilda para El Golf III.
    const matilda = await findUserId(client, "matilda");
    let golfExecId = null;
    if (matilda) {
      golfExecId = matilda.id;
      console.log(
        `[seed-edificios] Matilda encontrada: ${matilda.first_name || matilda.username || matilda.email} (id=${matilda.id}) → El Golf III se asigna a Matilda`,
      );
    } else {
      console.log(
        "[seed-edificios] Matilda NO existe en users → El Golf III queda SIN asignar",
      );
    }

    const targets = [
      { name: "La Aparición", assignedExecutiveId: ROCIO_ID },
      { name: "Tierra Buena", assignedExecutiveId: ROCIO_ID },
      { name: "El Golf III", assignedExecutiveId: golfExecId },
    ];

    const summary = [];
    for (const t of targets) {
      const res = await upsertBuilding(client, t);
      summary.push({ name: t.name, ...res });
    }

    console.log("[seed-edificios] resumen:");
    console.table(summary);

    const inserted = summary.filter((s) => s.action === "inserted").length;
    const skipped = summary.filter((s) => s.action === "skipped").length;
    console.log(
      `[seed-edificios] ✅ listo: ${inserted} insertado(s), ${skipped} ya existía(n).`,
    );
    if (inserted > 0) {
      console.log(
        `[seed-edificios] ⚠️  Recordá completar la dirección real (ahora "${PLACEHOLDER_ADDRESS}") desde el módulo Edificios.`,
      );
    }
  } catch (err) {
    // Regla 2 (calidad BUMA): loguear error con contexto, nunca silencioso.
    console.error(
      "[seed-edificios] FATAL en main(): falló la inserción de edificios faltantes:",
      err.message || err,
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[seed-edificios] FATAL (unhandled):", e.message || e);
  process.exit(1);
});
