#!/usr/bin/env node
"use strict";

/**
 * Cambia el rol de Rocío Oliveros en user_profiles a 'ejecutivo_apoyo'.
 *
 * Idempotente y defensivo:
 *   1. Asegura que el enum user_role tiene el valor 'ejecutivo_apoyo'
 *   2. Busca a Rocío por nombre/apellido (tolerante a tildes y mayúsculas)
 *   3. Si encuentra exactamente 1 match, actualiza user_profiles.role
 *   4. Si encuentra 0 o múltiples, lista candidatos y aborta sin modificar
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/fix-rocio-role.cjs
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[fix-rocio-role] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

// Endpoint directo (no -pooler) para que SET search_path funcione
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");

try {
  const u = new URL(directUrl);
  console.log(`[fix-rocio-role] target: ${u.host}/${u.pathname.slice(1)} as ${u.username}`);
  if (process.env.DATABASE_URL.includes("-pooler.")) {
    console.log(`[fix-rocio-role] note: usando endpoint directo (la DATABASE_URL del runtime no se modifica)`);
  }
} catch {
  console.error("[fix-rocio-role] DATABASE_URL malformada");
  process.exit(1);
}

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(
      `SELECT current_database() AS db, current_schema() AS schema, current_setting('search_path') AS sp`
    );
    console.log(`[fix-rocio-role] db=${meta.rows[0].db} schema=${meta.rows[0].schema} search_path=${meta.rows[0].sp}`);

    // 1) Asegurar que el enum acepta 'ejecutivo_apoyo'
    try {
      await client.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ejecutivo_apoyo'`);
      console.log(`  ✓ enum user_role: 'ejecutivo_apoyo' presente`);
    } catch (e) {
      console.error(`  ✗ no se pudo asegurar el valor del enum: ${e.message}`);
      process.exit(2);
    }

    // 2) Buscar candidatos a Rocío Oliveros
    const search = await client.query(
      `
      SELECT u.id, u.email, u.first_name, u.last_name, p.id AS profile_id, p.role, p.is_active
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.first_name ILIKE '%rocio%'
         OR u.first_name ILIKE '%rocío%'
         OR u.last_name ILIKE '%oliveros%'
      ORDER BY u.last_name, u.first_name
      `,
    );

    console.log(`\n[fix-rocio-role] candidatos encontrados: ${search.rowCount}`);
    for (const r of search.rows) {
      console.log(
        `  - id=${r.id} email=${r.email || "(null)"} ${r.first_name || ""} ${r.last_name || ""} role=${r.role || "(sin profile)"} active=${r.is_active}`,
      );
    }

    if (search.rowCount === 0) {
      console.error(`\n[fix-rocio-role] FATAL: no se encontró ningún usuario que coincida con Rocío Oliveros.`);
      process.exit(3);
    }
    if (search.rowCount > 1) {
      console.error(
        `\n[fix-rocio-role] FATAL: se encontraron ${search.rowCount} candidatos. ` +
        `Refiná la búsqueda o pasá un email exacto manualmente. No se modificó nada.`,
      );
      process.exit(4);
    }

    const target = search.rows[0];
    if (!target.profile_id) {
      console.error(
        `\n[fix-rocio-role] FATAL: el usuario existe (id=${target.id}) pero no tiene fila en user_profiles. ` +
        `Hay que crear el profile primero. No se modificó nada.`,
      );
      process.exit(5);
    }

    if (target.role === "ejecutivo_apoyo") {
      console.log(`\n[fix-rocio-role] no-op: el rol ya es 'ejecutivo_apoyo'.`);
      return;
    }

    // 3) Actualizar el rol
    console.log(`\n[fix-rocio-role] cambiando rol de '${target.role}' → 'ejecutivo_apoyo' (user_id=${target.id})`);
    const upd = await client.query(
      `
      UPDATE user_profiles
      SET role = 'ejecutivo_apoyo', updated_at = now()
      WHERE id = $1
      RETURNING id, role
      `,
      [target.profile_id],
    );

    if (upd.rowCount !== 1) {
      console.error(`[fix-rocio-role] FATAL: el UPDATE afectó ${upd.rowCount} filas (esperado 1)`);
      process.exit(6);
    }

    console.log(`  ✓ user_profiles[${upd.rows[0].id}].role = '${upd.rows[0].role}'`);
    console.log(`\n[fix-rocio-role] listo. Recordá correr POST /api/super-admin/sync-executives ` +
      `para que Rocío aparezca en el módulo Ejecutivos (la sync ahora incluye ejecutivo_apoyo).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[fix-rocio-role] FATAL:", e.message || e);
  process.exit(1);
});
