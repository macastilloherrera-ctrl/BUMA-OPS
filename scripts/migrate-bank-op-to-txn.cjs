#!/usr/bin/env node
"use strict";

/**
 * Fase 0 rediseño conciliación — migra el ENLACE income↔movimiento desde
 * incomes.bank_operation_id (donde hoy guarda el UUID del bank_transaction al
 * conciliar) a la nueva columna incomes.bank_transaction_id.
 *
 * Sólo toca filas cuyo bank_operation_id es realmente un bank_transactions.id
 * (no un N° de operación de email). Idempotente.
 *
 * Modos:
 *   node scripts/migrate-bank-op-to-txn.cjs            → DRY-RUN (no escribe)
 *   node scripts/migrate-bank-op-to-txn.cjs --copy     → copia UUID a bank_transaction_id (NO borra el viejo)
 *   node scripts/migrate-bank-op-to-txn.cjs --cleanup  → NULLea bank_operation_id de las filas ya copiadas
 *
 * Orden de despliegue (expand/contract, sin ventana rota):
 *   1) db-push-manual.cjs   (crea la columna)
 *   2) este script --copy   (ambas columnas tienen el enlace; código viejo y nuevo funcionan)
 *   3) deploy código nuevo  (usa bank_transaction_id)
 *   4) este script --cleanup (libera bank_operation_id)
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/migrate-bank-op-to-txn.cjs [--copy|--cleanup]
 */

const { Pool } = require("pg");

// Regla 1: validar env var al inicio con mensaje accionable.
if (!process.env.DATABASE_URL) {
  console.error("[migrate-bop] FATAL: falta configurar DATABASE_URL (env var no seteada)");
  process.exit(1);
}

// Igual que db-push-manual.cjs / seed-*: forzar endpoint directo (sin pooler)
// sólo en memoria, sin tocar la DATABASE_URL del runtime.
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");

try {
  const u = new URL(directUrl);
  console.log(`[migrate-bop] target: ${u.host}/${u.pathname.slice(1)} as ${u.username}`);
  if (process.env.DATABASE_URL.includes("-pooler.")) {
    console.log("[migrate-bop] note: original URL apuntaba al pooler; usando endpoint directo");
  }
} catch {
  console.error("[migrate-bop] FATAL: DATABASE_URL malformada");
  process.exit(1);
}

const MODE = process.argv.includes("--copy")
  ? "copy"
  : process.argv.includes("--cleanup")
    ? "cleanup"
    : "dryrun";

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

// Candidatas a COPIAR: bank_operation_id apunta a un bank_transactions.id real
// y todavía no se copió a bank_transaction_id.
const SELECT_PENDING_COPY = `
  SELECT i.id, i.bank_operation_id, i.status
  FROM incomes i
  WHERE i.bank_operation_id IS NOT NULL
    AND i.bank_transaction_id IS NULL
    AND EXISTS (SELECT 1 FROM bank_transactions bt WHERE bt.id = i.bank_operation_id)`;

// Candidatas a LIMPIAR: ya se copió el UUID (bank_operation_id == bank_transaction_id),
// así que bank_operation_id todavía tiene el UUID y hay que liberarlo.
const SELECT_PENDING_CLEANUP = `
  SELECT i.id
  FROM incomes i
  WHERE i.bank_transaction_id IS NOT NULL
    AND i.bank_operation_id = i.bank_transaction_id`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");

    const meta = await client.query(
      `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema`,
    );
    console.log(
      `[migrate-bop] connected: db=${meta.rows[0].db} user=${meta.rows[0].usr} schema=${meta.rows[0].schema} mode=${MODE}`,
    );

    // Sanity: la nueva columna debe existir (correr db-push-manual.cjs antes).
    const col = await client.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='incomes' AND column_name='bank_transaction_id'`,
    );
    if (col.rows.length === 0) {
      console.error(
        "[migrate-bop] FATAL: falta la columna incomes.bank_transaction_id. Corré scripts/db-push-manual.cjs primero.",
      );
      process.exit(2);
    }

    if (MODE === "dryrun") {
      const toCopy = await client.query(SELECT_PENDING_COPY);
      const toCleanup = await client.query(SELECT_PENDING_CLEANUP);
      console.log(`[migrate-bop] DRY-RUN — se COPIARÍAN ${toCopy.rows.length} filas (bank_operation_id → bank_transaction_id):`);
      console.table(toCopy.rows.slice(0, 20));
      if (toCopy.rows.length > 20) console.log(`[migrate-bop]   ...y ${toCopy.rows.length - 20} más`);
      console.log(`[migrate-bop] DRY-RUN — quedarían ${toCleanup.rows.length} filas para --cleanup.`);
      console.log("[migrate-bop] No se escribió nada. Ejecutá --copy, luego deploy, luego --cleanup.");
    } else if (MODE === "copy") {
      const res = await client.query(`
        UPDATE incomes i
        SET bank_transaction_id = i.bank_operation_id, updated_at = NOW()
        WHERE i.bank_operation_id IS NOT NULL
          AND i.bank_transaction_id IS NULL
          AND EXISTS (SELECT 1 FROM bank_transactions bt WHERE bt.id = i.bank_operation_id)`);
      console.log(`[migrate-bop] ✅ --copy: ${res.rowCount} filas actualizadas (enlace copiado; bank_operation_id intacto).`);
    } else if (MODE === "cleanup") {
      const res = await client.query(`
        UPDATE incomes i
        SET bank_operation_id = NULL, updated_at = NOW()
        WHERE i.bank_transaction_id IS NOT NULL
          AND i.bank_operation_id = i.bank_transaction_id`);
      console.log(`[migrate-bop] ✅ --cleanup: ${res.rowCount} filas — bank_operation_id liberado (era el UUID del movimiento).`);
    }
  } catch (err) {
    // Regla 2: loguear con contexto, nunca catch silencioso.
    console.error(`[migrate-bop] FATAL en main() (mode=${MODE}):`, err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[migrate-bop] FATAL (unhandled):", e.message || e);
  process.exit(1);
});
