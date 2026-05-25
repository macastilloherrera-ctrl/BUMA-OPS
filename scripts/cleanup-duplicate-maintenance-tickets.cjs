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
 * Pasar --fix-title para reescribir título y descripción del ticket KEEP
 * con el formato legible (title corto + description estructurada).
 *
 * Uso:
 *   DATABASE_URL=... node scripts/cleanup-duplicate-maintenance-tickets.cjs
 *   DATABASE_URL=... node scripts/cleanup-duplicate-maintenance-tickets.cjs --apply
 *   DATABASE_URL=... node scripts/cleanup-duplicate-maintenance-tickets.cjs --apply --fix-title
 *
 * Patrón estándar (strip -pooler, SET search_path TO public).
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[cleanup-mant] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const FIX_TITLE = process.argv.includes("--fix-title");
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
    console.log(`[cleanup-mant] mode: ${APPLY ? "APPLY (escritura)" : "DRY-RUN (solo lectura)"} | fix-title: ${FIX_TITLE ? "ON" : "off"}\n`);

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

    // 3. Pre-cargar buildings y assets para reescribir title/description del KEEP.
    //    Solo si --fix-title está activo.
    const buildingsById = new Map();
    const assetsById = new Map();
    if (FIX_TITLE) {
      const { rows: bs } = await client.query(`SELECT id, name FROM buildings`);
      for (const b of bs) buildingsById.set(b.id, b);
      const assetIds = [];
      for (const t of tickets) {
        const m = assetRe.exec(t.description || "");
        if (m) assetIds.push(m[1]);
      }
      if (assetIds.length > 0) {
        const { rows: as } = await client.query(
          `SELECT id, name, type, maintenance_frequency, next_maintenance_date
             FROM critical_assets WHERE id = ANY($1::varchar[])`,
          [Array.from(new Set(assetIds))],
        );
        for (const a of as) assetsById.set(a.id, a);
      }
    }

    function buildLegibleTitle(asset, building, daysOverdue) {
      const title = `Mantención vencida: ${asset.name} — ${building.name} (${daysOverdue} días de atraso)`;
      return title.length > 255 ? title.slice(0, 252) + "..." : title;
    }
    function buildLegibleDescription(asset, building, daysOverdue) {
      const frecuencia = asset.maintenance_frequency || "No especificada";
      return [
        `Equipo: ${asset.name} (${asset.type})`,
        `Edificio: ${building.name}`,
        `Vencido hace ${daysOverdue} día(s).`,
        `Frecuencia requerida: ${frecuencia}`,
        ``,
        `Generado automáticamente por el chequeo diario de mantenciones.`,
        ``,
        `asset:${asset.id}`,
      ].join("\n");
    }

    // 4. Procesar grupos con más de 1 ticket abierto + (opcional) reescribir KEEP.
    let duplicateGroups = 0;
    let toResolve = 0;
    const idsToResolve = [];
    const titleRewrites = []; // [{ id, title, description }]
    const now = new Date();
    for (const [key, arr] of groups.entries()) {
      const hasDuplicates = arr.length >= 2;
      if (hasDuplicates) duplicateGroups++;
      // Ordenar por created_at DESC para identificar el más reciente.
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const keep = arr[0];
      const dups = arr.slice(1);
      if (hasDuplicates) {
        console.log(`\n[grupo ${key.slice(0, 8)}…] ${arr.length} tickets abiertos:`);
        console.log(`  KEEP    id=${keep.id.slice(0, 8)}… created=${keep.created_at.toISOString().slice(0, 10)} status=${keep.status} title="${(keep.title || "").slice(0, 60)}"`);
        for (const d of dups) {
          console.log(`  RESOLVE id=${d.id.slice(0, 8)}… created=${d.created_at.toISOString().slice(0, 10)} status=${d.status} title="${(d.title || "").slice(0, 60)}"`);
          idsToResolve.push(d.id);
          toResolve++;
        }
      }
      if (FIX_TITLE) {
        const m = assetRe.exec(keep.description || "");
        if (!m) continue;
        const asset = assetsById.get(m[1]);
        const building = buildingsById.get(keep.building_id);
        if (!asset || !building) {
          console.log(`  ⚠️  fix-title: no se encontró asset o building para ticket ${keep.id.slice(0, 8)}…`);
          continue;
        }
        const daysOverdue = asset.next_maintenance_date
          ? Math.floor((now.getTime() - new Date(asset.next_maintenance_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const newTitle = buildLegibleTitle(asset, building, daysOverdue);
        const newDesc = buildLegibleDescription(asset, building, daysOverdue);
        const titleChanged = (keep.title || "") !== newTitle;
        const descChanged = (keep.description || "") !== newDesc;
        if (titleChanged || descChanged) {
          console.log(`  REWRITE id=${keep.id.slice(0, 8)}… → title="${newTitle.slice(0, 80)}" days=${daysOverdue}`);
          titleRewrites.push({ id: keep.id, title: newTitle, description: newDesc });
        }
      }
    }

    console.log(`\n[cleanup-mant] resumen: ${duplicateGroups} grupos con duplicados, ${toResolve} tickets a resolver, ${titleRewrites.length} KEEP a reescribir, ${groups.size - duplicateGroups} grupos sin duplicados.`);

    if (!APPLY) {
      console.log("\n[cleanup-mant] DRY-RUN — no se modificó nada. Re-correr con --apply para ejecutar.");
      return;
    }
    if (idsToResolve.length === 0 && titleRewrites.length === 0) {
      console.log("[cleanup-mant] No hay cambios pendientes.");
      return;
    }

    // 5. Aplicar todo en una transacción única.
    const closeNote = "\n\n[Cerrado automáticamente: duplicado del ticket más reciente del mismo equipo]";
    await client.query("BEGIN");
    try {
      let resolvedCount = 0;
      if (idsToResolve.length > 0) {
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
        resolvedCount = r.rowCount || 0;
      }

      let rewrittenCount = 0;
      for (const rw of titleRewrites) {
        const r = await client.query(
          `UPDATE tickets
              SET title = $2, description = $3, updated_at = NOW()
            WHERE id = $1`,
          [rw.id, rw.title, rw.description],
        );
        rewrittenCount += r.rowCount || 0;
      }

      // Audit log best-effort
      try {
        for (const id of idsToResolve) {
          await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            ["SYSTEM", "sistema", "cleanup_duplicate_maintenance", "ticket", id, JSON.stringify({ reason: "duplicate of newer ticket for same asset" })],
          );
        }
        for (const rw of titleRewrites) {
          await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            ["SYSTEM", "sistema", "rewrite_maintenance_title", "ticket", rw.id, JSON.stringify({ newTitle: rw.title })],
          );
        }
      } catch (auditErr) {
        console.warn(`[cleanup-mant] audit log opcional falló (no es crítico): ${auditErr.message}`);
      }
      await client.query("COMMIT");
      console.log(`\n[cleanup-mant] ✅ ${resolvedCount} tickets resueltos, ${rewrittenCount} títulos reescritos.`);
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
