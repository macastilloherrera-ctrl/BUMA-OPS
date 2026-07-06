#!/usr/bin/env node
"use strict";

/**
 * Verifica los 7 fixes del módulo de Ingresos + 2 fixes de eliminación de tickets.
 *
 *  1. tryLinkBankTxnToIncome cambia status del income a "identified" + audit_log
 *  2. Existe POST /api/bank-transactions/:id/create-income en routes.ts
 *  3. POST /api/incomes valida ciclo bloqueado (assertCycleNotLocked)
 *  4. POST /api/incomes/split usa transacción (BEGIN/COMMIT/ROLLBACK)
 *  5. Form de Ingresos.tsx expone payerRut y payerName + valida RUT chileno
 *  6. /api/incomes/export marca exportedAt ANTES de res.send
 *  7. PATCH /api/incomes/:id valida ciclo del paymentDate nuevo también
 *  8. DELETE /api/tickets/:id (manager/super_admin, solo pendiente, transaccional)
 *  9. Botón "Eliminar Ticket" en TicketDetail.tsx con confirmación
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/verify-incomes-fixes.cjs
 *
 * Patrón de conexión idéntico a scripts/verify-apoyo-fixes.cjs.
 * NO modifica datos, solo lee.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  console.error("[verify-incomes] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const ROOT = path.join(__dirname, "..");
const ROUTES = fs.readFileSync(path.join(ROOT, "server", "routes.ts"), "utf8");
const INGRESOS = fs.readFileSync(path.join(ROOT, "client", "src", "pages", "Ingresos.tsx"), "utf8");
const CONCILIACION = fs.readFileSync(
  path.join(ROOT, "client", "src", "pages", "ConciliacionBancaria.tsx"),
  "utf8",
);
const TICKET_DETAIL = fs.readFileSync(
  path.join(ROOT, "client", "src", "pages", "TicketDetail.tsx"),
  "utf8",
);

function locate(fileText, needle) {
  const idx = fileText.indexOf(needle);
  if (idx < 0) return null;
  const upTo = fileText.slice(0, idx);
  return upTo.split("\n").length;
}

function check1AutoIdentified() {
  console.log("\n=== 1. tryLinkBankTxnToIncome cambia status + audit_log ===");
  const fnStart = ROUTES.indexOf("async function tryLinkBankTxnToIncome");
  if (fnStart < 0) {
    console.log("❌ Función tryLinkBankTxnToIncome no encontrada");
    return { ok: false };
  }
  const fnEnd = ROUTES.indexOf("\n}\n", fnStart);
  const body = ROUTES.slice(fnStart, fnEnd);
  const setsStatus = /status:\s*"identified"/.test(body);
  const setsBankOp = /bankTransactionId:\s*txn\.id/.test(body);
  const writesAudit = /action:\s*"income_auto_identified"/.test(body);
  const passesActor = /actorUserId\?:\s*string/.test(body);
  console.log(`  setea status="identified":         ${setsStatus ? "✅" : "❌"}`);
  console.log(`  setea bankTransactionId=txn.id:    ${setsBankOp ? "✅" : "❌"}`);
  console.log(`  audit action income_auto_identified: ${writesAudit ? "✅" : "❌"}`);
  console.log(`  acepta actorUserId opcional:       ${passesActor ? "✅" : "❌"}`);

  const callSites = ROUTES.match(/tryLinkBankTxnToIncome\(txn[^)]*\)/g) || [];
  const allCallsPassActor = callSites.filter((c) => c.includes("req.user!.id")).length;
  console.log(`  call sites con actorUserId:        ${allCallsPassActor}/${callSites.length}`);
  return {
    ok: setsStatus && setsBankOp && writesAudit && passesActor && allCallsPassActor === callSites.length - 0,
  };
}

function check2CreateIncomeEndpoint() {
  console.log("\n=== 2. POST /api/bank-transactions/:id/create-income ===");
  const route = '/api/bank-transactions/:id/create-income';
  const line = locate(ROUTES, route);
  if (!line) {
    console.log("❌ Endpoint no encontrado en routes.ts");
    return { ok: false };
  }
  console.log(`  endpoint declarado en routes.ts:L${line} ✅`);

  const slice = ROUTES.slice(ROUTES.indexOf(route));
  const hasStatusCheck = /txn\.status\s*!==\s*"identified"/.test(slice.slice(0, 4000));
  const setsIdentifiedStatus = /status:\s*"identified"/.test(slice.slice(0, 4000));
  const setsBankOpId = /bankTransactionId:\s*txn\.id/.test(slice.slice(0, 4000));
  const auditAction = /action:\s*"create_income_from_bank_txn"/.test(slice.slice(0, 4000));
  console.log(`  rechaza si txn.status != identified: ${hasStatusCheck ? "✅" : "❌"}`);
  console.log(`  income creado con status=identified: ${setsIdentifiedStatus ? "✅" : "❌"}`);
  console.log(`  income.bankTransactionId = txn.id:   ${setsBankOpId ? "✅" : "❌"}`);
  console.log(`  audit log create_income_from_bank_txn: ${auditAction ? "✅" : "❌"}`);

  const btnLine = locate(CONCILIACION, "Registrar Ingreso");
  console.log(`  botón "Registrar Ingreso" en UI:     ${btnLine ? `✅ (L${btnLine})` : "❌"}`);
  const enriched = /linkedIncomeId:\s*incomesByBankTxnId/.test(ROUTES);
  console.log(`  GET /api/bank-transactions enriquece linkedIncomeId: ${enriched ? "✅" : "❌"}`);
  return { ok: hasStatusCheck && setsIdentifiedStatus && setsBankOpId && auditAction && !!btnLine && enriched };
}

function check3PostValidaCiclo() {
  console.log("\n=== 3. POST /api/incomes valida assertCycleNotLocked ===");
  const postStart = ROUTES.indexOf('app.post("/api/incomes", isAuthenticated');
  if (postStart < 0) {
    console.log("❌ Endpoint POST /api/incomes no encontrado");
    return { ok: false };
  }
  // Tomar el cuerpo del handler hasta el siguiente app.patch/app.delete/app.post
  const after = ROUTES.slice(postStart);
  const nextHandler = after.search(/\n\s+app\.(patch|delete|post|get)\(/);
  const body = nextHandler > 0 ? after.slice(0, nextHandler) : after.slice(0, 3000);
  const hasAssert = /assertCycleNotLocked\(/.test(body);
  const has409 = /status\(409\)/.test(body);
  console.log(`  llama assertCycleNotLocked:          ${hasAssert ? "✅" : "❌"}`);
  console.log(`  responde 409 si bloqueado:           ${has409 ? "✅" : "❌"}`);
  return { ok: hasAssert && has409 };
}

function check4SplitTransaccional() {
  console.log("\n=== 4. POST /api/incomes/split es transaccional ===");
  const splitStart = ROUTES.indexOf('app.post("/api/incomes/split"');
  if (splitStart < 0) {
    console.log("❌ Endpoint /api/incomes/split no encontrado");
    return { ok: false };
  }
  const after = ROUTES.slice(splitStart);
  const nextHandler = after.indexOf('app.get("/api/vendors"');
  const body = nextHandler > 0 ? after.slice(0, nextHandler) : after.slice(0, 6000);
  const hasConnect = /pool\.connect\(\)/.test(body);
  const hasBegin = /client\.query\("BEGIN"\)/.test(body);
  const hasCommit = /client\.query\("COMMIT"\)/.test(body);
  const hasRollback = /client\.query\("ROLLBACK"\)/.test(body);
  const hasRelease = /client\.release\(\)/.test(body);
  console.log(`  pool.connect():                       ${hasConnect ? "✅" : "❌"}`);
  console.log(`  BEGIN:                                ${hasBegin ? "✅" : "❌"}`);
  console.log(`  COMMIT:                               ${hasCommit ? "✅" : "❌"}`);
  console.log(`  ROLLBACK en catch:                    ${hasRollback ? "✅" : "❌"}`);
  console.log(`  client.release() en finally:          ${hasRelease ? "✅" : "❌"}`);
  return { ok: hasConnect && hasBegin && hasCommit && hasRollback && hasRelease };
}

function check5PayerFieldsUI() {
  console.log("\n=== 5. Form de Ingresos.tsx expone payerRut + payerName ===");
  const hasRutSchema = /payerRut:\s*z\.string\(\)\.optional\(\)\.refine/.test(INGRESOS);
  const hasNameSchema = /payerName:\s*z\.string\(\)\.optional\(\)/.test(INGRESOS);
  const hasRutRegex = /rutChileRegex/.test(INGRESOS);
  const hasRutInput = /name="payerRut"/.test(INGRESOS);
  const hasNameInput = /name="payerName"/.test(INGRESOS);
  const hasOpenEditMapping = /payerRut:\s*income\.payerRut/.test(INGRESOS);
  console.log(`  schema.payerRut con refine:           ${hasRutSchema ? "✅" : "❌"}`);
  console.log(`  schema.payerName optional:            ${hasNameSchema ? "✅" : "❌"}`);
  console.log(`  rutChileRegex declarado:              ${hasRutRegex ? "✅" : "❌"}`);
  console.log(`  FormField name="payerRut":            ${hasRutInput ? "✅" : "❌"}`);
  console.log(`  FormField name="payerName":           ${hasNameInput ? "✅" : "❌"}`);
  console.log(`  openEdit mapea income.payerRut:       ${hasOpenEditMapping ? "✅" : "❌"}`);
  return {
    ok: hasRutSchema && hasNameSchema && hasRutRegex && hasRutInput && hasNameInput && hasOpenEditMapping,
  };
}

function check6ExportOrder() {
  console.log("\n=== 6. /api/incomes/export marca antes de res.send ===");
  const exportStart = ROUTES.indexOf('app.get("/api/incomes/export"');
  if (exportStart < 0) {
    console.log("❌ Endpoint no encontrado");
    return { ok: false };
  }
  const after = ROUTES.slice(exportStart);
  const nextHandler = after.indexOf('app.get("/api/incomes/export/edipro"');
  const body = nextHandler > 0 ? after.slice(0, nextHandler) : after.slice(0, 5000);
  const markIdx = body.indexOf("markIncomesExported");
  const sendIdx = body.indexOf("res.send(buf)");
  const handlesErr = /No se pudo marcar los ingresos como exportados/.test(body);
  console.log(`  markIncomesExported antes de res.send: ${markIdx > 0 && sendIdx > 0 && markIdx < sendIdx ? "✅" : "❌"}`);
  console.log(`  responde 500 si falla la marca:        ${handlesErr ? "✅" : "❌"}`);
  return { ok: markIdx > 0 && sendIdx > 0 && markIdx < sendIdx && handlesErr };
}

function check7PatchValidaNuevoPeriodo() {
  console.log("\n=== 7. PATCH /api/incomes/:id valida nuevo paymentDate ===");
  const patchStart = ROUTES.indexOf('app.patch("/api/incomes/:id"');
  if (patchStart < 0) {
    console.log("❌ Endpoint PATCH /api/incomes/:id no encontrado");
    return { ok: false };
  }
  const after = ROUTES.slice(patchStart);
  const nextHandler = after.indexOf('app.delete("/api/incomes/:id"');
  const body = nextHandler > 0 ? after.slice(0, nextHandler) : after.slice(0, 5000);
  const oldChecks = (body.match(/assertCycleNotLocked\(/g) || []).length;
  const hasPeriodChanged = /periodChanged/.test(body);
  const hasLockCheckNew = /lockCheckNew/.test(body);
  console.log(`  llamadas a assertCycleNotLocked:      ${oldChecks} (esperado: 2)`);
  console.log(`  detecta periodChanged:                ${hasPeriodChanged ? "✅" : "❌"}`);
  console.log(`  variable lockCheckNew para nuevo periodo: ${hasLockCheckNew ? "✅" : "❌"}`);
  return { ok: oldChecks >= 2 && hasPeriodChanged && hasLockCheckNew };
}

function check8DeleteTicketEndpoint() {
  console.log("\n=== 8. DELETE /api/tickets/:id (manager/super_admin, solo pendiente) ===");
  const route = 'app.delete("/api/tickets/:id"';
  const line = locate(ROUTES, route);
  if (!line) {
    console.log("❌ Endpoint DELETE /api/tickets/:id no encontrado");
    return { ok: false };
  }
  console.log(`  endpoint declarado en routes.ts:L${line} ✅`);

  const slice = ROUTES.slice(ROUTES.indexOf(route));
  const next = slice.indexOf('app.post("/api/tickets/:id/escalate"');
  const body = next > 0 ? slice.slice(0, next) : slice.slice(0, 6000);

  const checksSuperAdmin = /profile\.role\s*===\s*"super_admin"/.test(body);
  const checksManager = /isManagerRole\(profile\)/.test(body);
  const checksPendiente = /ticket\.status\s*!==\s*"pendiente"/.test(body);
  const blocksExpenses = /FROM expenses WHERE source_ticket_id/.test(body);
  const blocksMaintenance = /FROM maintenance_records WHERE ticket_id/.test(body);
  const hasBegin = /client\.query\("BEGIN"\)/.test(body);
  const hasCommit = /client\.query\("COMMIT"\)/.test(body);
  const hasRollback = /client\.query\("ROLLBACK"\)/.test(body);
  const auditAction = /action:\s*"delete_ticket"/.test(body);
  const deletesDependents = /DELETE FROM ticket_quotes/.test(body)
    && /DELETE FROM ticket_photos/.test(body)
    && /DELETE FROM ticket_work_cycles/.test(body)
    && /DELETE FROM ticket_assignment_history/.test(body)
    && /DELETE FROM ticket_communications/.test(body)
    && /DELETE FROM notifications/.test(body);

  console.log(`  permite super_admin:                  ${checksSuperAdmin ? "✅" : "❌"}`);
  console.log(`  permite isManagerRole:                ${checksManager ? "✅" : "❌"}`);
  console.log(`  rechaza si status != pendiente:       ${checksPendiente ? "✅" : "❌"}`);
  console.log(`  rechaza si tiene expenses:            ${blocksExpenses ? "✅" : "❌"}`);
  console.log(`  rechaza si tiene maintenance_records: ${blocksMaintenance ? "✅" : "❌"}`);
  console.log(`  transaccional BEGIN/COMMIT/ROLLBACK:  ${hasBegin && hasCommit && hasRollback ? "✅" : "❌"}`);
  console.log(`  borra dependencias (6 tablas):        ${deletesDependents ? "✅" : "❌"}`);
  console.log(`  audit log delete_ticket:              ${auditAction ? "✅" : "❌"}`);
  return {
    ok: checksSuperAdmin && checksManager && checksPendiente && blocksExpenses && blocksMaintenance
      && hasBegin && hasCommit && hasRollback && deletesDependents && auditAction,
  };
}

function check9DeleteTicketUI() {
  console.log("\n=== 9. Botón Eliminar Ticket en TicketDetail.tsx ===");
  const hasFlag = /canDeleteTicket\s*=\s*isSuperAdmin\s*\|\|\s*isManager/.test(TICKET_DETAIL);
  const hasMutation = /deleteTicketMutation\s*=\s*useMutation/.test(TICKET_DETAIL);
  const hasButton = /data-testid="button-delete-ticket"/.test(TICKET_DETAIL);
  const guardedByStatus = /canDeleteTicket\s*&&\s*ticket\.status\s*===\s*"pendiente"/.test(TICKET_DETAIL);
  const hasAlertDialog = /AlertDialog open=\{isDeleteTicketDialogOpen\}/.test(TICKET_DETAIL);
  const navigatesOnSuccess = /navigate\(backUrl\)/.test(TICKET_DETAIL);
  console.log(`  flag canDeleteTicket:                 ${hasFlag ? "✅" : "❌"}`);
  console.log(`  deleteTicketMutation:                 ${hasMutation ? "✅" : "❌"}`);
  console.log(`  botón con data-testid:                ${hasButton ? "✅" : "❌"}`);
  console.log(`  botón visible solo si pendiente:      ${guardedByStatus ? "✅" : "❌"}`);
  console.log(`  AlertDialog de confirmación:          ${hasAlertDialog ? "✅" : "❌"}`);
  console.log(`  vuelve al listado tras éxito:         ${navigatesOnSuccess ? "✅" : "❌"}`);
  return { ok: hasFlag && hasMutation && hasButton && guardedByStatus && hasAlertDialog && navigatesOnSuccess };
}

async function dbSanityCheck(client) {
  console.log("\n=== DB sanity checks (Neon) ===");

  // a) tabla incomes tiene columnas payer_rut y payer_name
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incomes'
  `);
  const colSet = new Set(cols.rows.map((r) => r.column_name));
  const needed = ["payer_rut", "payer_name", "bank_operation_id", "bank_transaction_id", "exported_at", "status"];
  const missing = needed.filter((c) => !colSet.has(c));
  console.log(`  columnas requeridas presentes:        ${missing.length === 0 ? "✅" : "❌ falta: " + missing.join(",")}`);

  // b) enum income_status incluye 'identified'
  const enums = await client.query(`
    SELECT e.enumlabel
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'income_status'
    ORDER BY e.enumsortorder
  `);
  const labels = enums.rows.map((r) => r.enumlabel);
  const hasIdentified = labels.includes("identified");
  console.log(`  enum income_status incluye 'identified': ${hasIdentified ? "✅" : "❌"} (labels: ${labels.join(", ")})`);

  // c) inventario actual: cuántos incomes en cada status
  const counts = await client.query(`
    SELECT status, COUNT(*)::int AS n FROM incomes GROUP BY status ORDER BY status
  `);
  console.log(`  inventario actual de incomes por status:`);
  for (const r of counts.rows) console.log(`    ${r.status}: ${r.n}`);

  // d) bank_transactions identified sin income vinculado (snapshot — no se modifican)
  const orphans = await client.query(`
    SELECT bt.id, bt.building_id, bt.amount, bt.txn_date, bt.assigned_unit
    FROM bank_transactions bt
    LEFT JOIN incomes i ON i.bank_transaction_id = bt.id
    WHERE bt.status = 'identified'
      AND bt.assigned_units_split IS NULL
      AND bt.assigned_unit IS NOT NULL
      AND i.id IS NULL
    ORDER BY bt.txn_date DESC
    LIMIT 5
  `);
  console.log(`  txns identified SIN income vinculado: ${orphans.rows.length} (muestra hasta 5)`);
  for (const r of orphans.rows) {
    console.log(
      `    txn=${r.id.slice(0, 8)}… unit=${r.assigned_unit} monto=${r.amount} fecha=${r.txn_date?.toISOString?.().slice(0, 10) || r.txn_date}`,
    );
  }

  // e) incomes con bank_transaction_id (enlace) pero status != identified — debería ser raro
  const inconsistent = await client.query(`
    SELECT id, status, amount, payment_date
    FROM incomes
    WHERE bank_transaction_id IS NOT NULL
      AND status <> 'identified'
    ORDER BY payment_date DESC
    LIMIT 10
  `);
  console.log(`  incomes con bank_transaction_id pero status != identified: ${inconsistent.rows.length}`);
  for (const r of inconsistent.rows) {
    console.log(`    income=${r.id.slice(0, 8)}… status=${r.status} monto=${r.amount}`);
  }

  return {
    ok: missing.length === 0 && hasIdentified,
    orphanTxns: orphans.rows.length,
    inconsistentIncomes: inconsistent.rows.length,
  };
}

async function main() {
  const checks = {};
  checks.fix1 = check1AutoIdentified();
  checks.fix2 = check2CreateIncomeEndpoint();
  checks.fix3 = check3PostValidaCiclo();
  checks.fix4 = check4SplitTransaccional();
  checks.fix5 = check5PayerFieldsUI();
  checks.fix6 = check6ExportOrder();
  checks.fix7 = check7PatchValidaNuevoPeriodo();
  checks.fix8 = check8DeleteTicketEndpoint();
  checks.fix9 = check9DeleteTicketUI();

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(`SELECT current_database() AS db, current_user AS u`);
    console.log(`\n[verify-incomes] connected db=${meta.rows[0].db} user=${meta.rows[0].u}`);
    checks.db = await dbSanityCheck(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n=== RESUMEN ===");
  console.log(`1. Auto-identified al enlazar:        ${checks.fix1.ok ? "✅" : "❌"}`);
  console.log(`2. Endpoint create-income + botón:    ${checks.fix2.ok ? "✅" : "❌"}`);
  console.log(`3. POST /api/incomes valida ciclo:    ${checks.fix3.ok ? "✅" : "❌"}`);
  console.log(`4. Split transaccional:               ${checks.fix4.ok ? "✅" : "❌"}`);
  console.log(`5. payerRut/payerName en UI:          ${checks.fix5.ok ? "✅" : "❌"}`);
  console.log(`6. markExported antes de send:        ${checks.fix6.ok ? "✅" : "❌"}`);
  console.log(`7. PATCH valida nuevo periodo:        ${checks.fix7.ok ? "✅" : "❌"}`);
  console.log(`8. DELETE /api/tickets/:id:           ${checks.fix8.ok ? "✅" : "❌"}`);
  console.log(`9. Botón Eliminar Ticket UI:          ${checks.fix9.ok ? "✅" : "❌"}`);
  console.log(`DB sanity (cols + enum identified):   ${checks.db.ok ? "✅" : "❌"}`);
  console.log(`TypeScript:                           (correr 'npx tsc --noEmit')`);

  const allOk = Object.values(checks).every((c) => c.ok);
  if (!allOk) process.exit(2);
}

main().catch((e) => {
  console.error("[verify-incomes] FATAL:", e);
  process.exit(1);
});
