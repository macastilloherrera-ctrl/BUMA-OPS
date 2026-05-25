#!/usr/bin/env node
"use strict";

/**
 * Detecta y resuelve tickets duplicados de mantención vencida generados
 * automáticamente antes del fix de dedup (commit eeeafb1). Agrupa por
 * asset:UUID en la descripción + buildingId, y para cada grupo con más
 * de 1 ticket abierto deja el MÁS RECIENTE y marca los anteriores como
 * resueltos con cierre automático.
 *
 * Modo dry-run por default. Pasar --apply para ejecutar realmente.
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/cleanup-duplicate-maintenance-tickets.cjs
 *   DATABASE_URL="postgres://..." node scripts/cleanup-duplicate-maintenance-tickets.cjs --apply
 *
 * Patrón estándar (strip -pooler, SET search_path TO public).
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[cleanup-mant] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

// Estados considerados "cerrados". Mismo set que CLOSED_STATUSES en routes.ts.
const CLOSED_STATUSES = new Set(["resuelto"]);

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(`SELECT current_database() AS db, current_user AS u`);
    console.log(`[cleanup-mant] connected db=${meta.rows[0].db} user=${meta.rows[0].u}`);
    console.log(`[cleanup-mant] mode: ${APPLY ? "APPLY (escritura)" : "DRY-RUN (solo lectura)"}\n`);

    // 1. Traer todos los tickets de mantención abiertos que contengan el tag
    //    asset:UUID en la descripción (formato nuevo y viejo).
    const { rows: tickets } = await client.query(`
      SELECT id, building_id, status, description, title, priority,
             created_at, updated_at, assigned_executive_id
        FROM tickets
       WHERE ticket_type = 'mantencion'
         AND status <> 'resuelto'
         AND description ~ 'asset:[0-9a-f-]{36}'
       ORDER BY building_id, created_at ASC
    `);
    console.log(`[cleanup-mant] tickets de mantención abiertos con tag asset:UUID: ${tickets.length}`);
    if (tickets.length === 0) {
      console.log("Nada que limpiar.");
      return;
    }

    // 2. Extraer asset:UUID de cada ticket y agrupar por (asset, building).
    const groups = new Map(); // key: building_id|asset_id  ->  [ticket, ...]
    const assetRe = /asset:([0-9a-f-]{36})/i;
    for (const t of tickets) {
      if (CLOSED_STATUSES.has(t.status)) continue;
      const m = assetRe.exec(t.description || "");
      if (!m) continue;
      const key = `${t.building_id}|${m[1]}`;
      const arr = groups.get(key) || [];
      arr.push(t);
      groups.set(key, arr);
    }

    // 3. Procesar grupos con más de 1 ticket abierto.
    let duplicateGroups = 0;
    let toResolve = 0;
    const idsToResolve = [];
    for (const [key, arr] of groups.entries()) {
      if (arr.length < 2) continue;
      duplicateGroups++;
      // Ordenar por created_at DESC para identificar el más reciente.
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const keep = arr[0];
      const dups = arr.slice(1);
      console.log(`\n[grupo ${key.slice(0, 8)}…] ${arr.length} tickets abiertos:`);
      console.log(`  KEEP    id=${keep.id.slice(0, 8)}… created=${keep.created_at.toISOString().slice(0, 10)} status=${keep.status} title="${(keep.title || "").slice(0, 60)}"`);
      for (const d of dups) {
        console.log(`  RESOLVE id=${d.id.slice(0, 8)}… created=${d.created_at.toISOString().slice(0, 10)} status=${d.status} title="${(d.title || "").slice(0, 60)}"`);
        idsToResolve.push(d.id);
        toResolve++;
      }
    }

    console.log(`\n[cleanup-mant] resumen: ${duplicateGroups} grupos con duplicados, ${toResolve} tickets a resolver, ${groups.size - duplicateGroups} grupos sin duplicados.`);

    if (!APPLY) {
      console.log("\n[cleanup-mant] DRY-RUN — no se modificó nada. Re-correr con --apply para ejecutar.");
      return;
    }
    if (idsToResolve.length === 0) {
      console.log("[cleanup-mant] No hay tickets para resolver.");
      return;
    }

    // 4. Aplicar en transacción. Marca status=resuelto, resolved_at=NOW(),
    //    closed_at=NOW(), closed_by=SYSTEM y appendea nota al description.
    const closeNote = "\n\n[Cerrado automáticamente: duplicado del ticket más reciente del mismo equipo]";
    await client.query("BEGIN");
    try {
      const r = await client.query(
        `UPDATE tickets
            SET status = 'resuelto',
                resolved_at = COALESCE(resolved_at, NOW()),
                closed_at   = COALESCE(closed_at, NOW()),
                closed_by   = COALESCE(closed_by, 'SYSTEM'),
                description = description || $2,
                updated_at  = NOW()
          WHERE id = ANY($1::varchar[])`,
        [idsToResolve, closeNote],
      );
      // Registro de auditoría (best-effort; si la tabla tiene constraints
      // que rechazan SYSTEM, swallow para no abortar la limpieza).
      try {
        for (const id of idsToResolve) {
          await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            ["SYSTEM", "sistema", "cleanup_duplicate_maintenance", "ticket", id, JSON.stringify({ reason: "duplicate of newer ticket for same asset" })],
          );
        }
      } catch (auditErr) {
        console.warn(`[cleanup-mant] audit log opcional falló (no es crítico): ${auditErr.message}`);
      }
      await client.query("COMMIT");
      console.log(`\n[cleanup-mant] ✅ ${r.rowCount} tickets resueltos exitosamente.`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("[cleanup-mant] ❌ Falló la transacción, rollback aplicado:", e.message);
      process.exit(2);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[cleanup-mant] FATAL:", e);
  process.exit(1);
});
