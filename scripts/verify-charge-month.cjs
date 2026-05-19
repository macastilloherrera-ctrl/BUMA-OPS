#!/usr/bin/env node
"use strict";

/**
 * Verifica el feature chargeMonth/chargeYear en incomes:
 *
 *   1. Schema:     campos chargeMonth/chargeYear en shared/schema.ts
 *   2. Storage:    getIncomes filtra con regla OR (charge IS NOT NULL ó EXTRACT
 *                  de payment_date)
 *   3. routes:     helper resolveIncomePeriod + call sites POST/PATCH/DELETE
 *   4. Webhook:    zod acepta chargeMonth/chargeYear opcionales + lockCheck usa
 *                  resolveIncomePeriod
 *   5. Split:      acepta chargeMonth/chargeYear, INSERT incluye columnas
 *   6. UI:         Ingresos.tsx tiene checkbox + selects + lógica de envío
 *   7. Migración:  db-push-manual.cjs aplica ALTER + verifications
 *   8. DB sanity:  columnas existen en Neon y son nullable
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/verify-charge-month.cjs
 *
 * NO modifica datos.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  console.error("[verify-charge-month] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const ROOT = path.join(__dirname, "..");
const SCHEMA = fs.readFileSync(path.join(ROOT, "shared", "schema.ts"), "utf8");
const STORAGE = fs.readFileSync(path.join(ROOT, "server", "storage.ts"), "utf8");
const ROUTES = fs.readFileSync(path.join(ROOT, "server", "routes.ts"), "utf8");
const INGRESOS = fs.readFileSync(path.join(ROOT, "client", "src", "pages", "Ingresos.tsx"), "utf8");
const MIGRATION = fs.readFileSync(path.join(ROOT, "scripts", "db-push-manual.cjs"), "utf8");

function check1Schema() {
  console.log("\n=== 1. Schema en incomes ===");
  // Verificar que el bloque incomes (entre `incomes = pgTable("incomes"` y el `});`) contiene los campos
  const tableStart = SCHEMA.indexOf('incomes = pgTable("incomes"');
  const tableEnd = SCHEMA.indexOf("});", tableStart);
  const body = SCHEMA.slice(tableStart, tableEnd);
  const hasChargeMonth = /chargeMonth: integer\("charge_month"\)/.test(body);
  const hasChargeYear = /chargeYear: integer\("charge_year"\)/.test(body);
  // Confirmar que son nullable (sin notNull)
  const monthNullable = hasChargeMonth && !/chargeMonth:[^,]+\.notNull/.test(body);
  const yearNullable = hasChargeYear && !/chargeYear:[^,]+\.notNull/.test(body);
  console.log(`  chargeMonth integer en tabla incomes: ${hasChargeMonth ? "✅" : "❌"}`);
  console.log(`  chargeYear integer en tabla incomes:  ${hasChargeYear ? "✅" : "❌"}`);
  console.log(`  ambos nullable (sin notNull):         ${monthNullable && yearNullable ? "✅" : "❌"}`);
  return { ok: hasChargeMonth && hasChargeYear && monthNullable && yearNullable };
}

function check2StorageFilter() {
  console.log("\n=== 2. storage.getIncomes filtro condicional ===");
  const fnStart = STORAGE.indexOf("async getIncomes(");
  const fnEnd = STORAGE.indexOf("\n  }", fnStart);
  const body = STORAGE.slice(fnStart, fnEnd);
  const usesOr = /\bor\(/.test(body);
  const hasChargeBranch = /incomes\.chargeMonth.*IS NOT NULL[\s\S]*incomes\.chargeMonth, filters\.month/i.test(body);
  const hasFallbackBranch = /incomes\.chargeMonth.*IS NULL[\s\S]*EXTRACT\(MONTH FROM/i.test(body);
  console.log(`  usa or() de drizzle:                  ${usesOr ? "✅" : "❌"}`);
  console.log(`  rama charge_month IS NOT NULL:        ${hasChargeBranch ? "✅" : "❌"}`);
  console.log(`  rama fallback EXTRACT(payment_date):  ${hasFallbackBranch ? "✅" : "❌"}`);
  return { ok: usesOr && hasChargeBranch && hasFallbackBranch };
}

function check3RoutesHelper() {
  console.log("\n=== 3. Helper resolveIncomePeriod + call sites ===");
  const hasHelper = /function resolveIncomePeriod\(/.test(ROUTES);
  const callsites = (ROUTES.match(/resolveIncomePeriod\(/g) || []).length;
  console.log(`  helper resolveIncomePeriod:           ${hasHelper ? "✅" : "❌"}`);
  console.log(`  call sites en routes.ts:              ${callsites} (esperado ≥ 5)`);

  // Comprobar que los endpoints de incomes lo usen
  const postOk = /assertCycleNotLocked\(incomeData\.buildingId, period\.month, period\.year\)/.test(ROUTES);
  const patchOldOk = /lockCheck = await assertCycleNotLocked\(existingIncome\.buildingId, oldPeriod\.month, oldPeriod\.year\)/.test(ROUTES);
  const patchNewOk = /lockCheckNew = await assertCycleNotLocked\(newBuildingId, nextPeriod\.month, nextPeriod\.year\)/.test(ROUTES);
  const deleteOk = /lockCheck = await assertCycleNotLocked\(existing\.buildingId, period\.month, period\.year\)/.test(ROUTES);
  console.log(`  POST   usa resolveIncomePeriod:       ${postOk ? "✅" : "❌"}`);
  console.log(`  PATCH (anterior) usa resolveIncomePeriod: ${patchOldOk ? "✅" : "❌"}`);
  console.log(`  PATCH (nuevo)    usa resolveIncomePeriod: ${patchNewOk ? "✅" : "❌"}`);
  console.log(`  DELETE usa resolveIncomePeriod:       ${deleteOk ? "✅" : "❌"}`);
  return { ok: hasHelper && callsites >= 5 && postOk && patchOldOk && patchNewOk && deleteOk };
}

function check4Webhook() {
  console.log("\n=== 4. Webhook acepta chargeMonth/Year ===");
  const webhookStart = ROUTES.indexOf('app.post("/api/incomes/webhook"');
  const next = ROUTES.indexOf('// Vendor Directory', webhookStart);
  const body = next > 0 ? ROUTES.slice(webhookStart, next) : ROUTES.slice(webhookStart, webhookStart + 9000);
  const zodMonth = /chargeMonth: z\.number\(\)\.int\(\)\.min\(1\)\.max\(12\)\.nullable\(\)\.optional\(\)/.test(body);
  const zodYear = /chargeYear: z\.number\(\)\.int\(\)\.min\(2000\)\.max\(2100\)\.nullable\(\)\.optional\(\)/.test(body);
  const persistsBoth = /chargeMonth,\s*chargeYear,/.test(body);
  const usesResolve = /period = resolveIncomePeriod\(/.test(body);
  console.log(`  zod chargeMonth (1-12) opcional:      ${zodMonth ? "✅" : "❌"}`);
  console.log(`  zod chargeYear (2000-2100) opcional:  ${zodYear ? "✅" : "❌"}`);
  console.log(`  persiste ambos en income:             ${persistsBoth ? "✅" : "❌"}`);
  console.log(`  lockCheck usa resolveIncomePeriod:    ${usesResolve ? "✅" : "❌"}`);
  return { ok: zodMonth && zodYear && persistsBoth && usesResolve };
}

function check5Split() {
  console.log("\n=== 5. Split acepta chargeMonth/Year ===");
  const splitStart = ROUTES.indexOf('app.post("/api/incomes/split"');
  const next = ROUTES.indexOf("// ==========================================", splitStart + 200);
  const body = next > 0 ? ROUTES.slice(splitStart, next) : ROUTES.slice(splitStart, splitStart + 7000);
  const destructures = /\{[^}]*chargeMonth, chargeYear[^}]*\} = req\.body/.test(body);
  const validatesRange = /typeof chargeMonth === "number" && chargeMonth >= 1 && chargeMonth <= 12/.test(body);
  const insertsCols = /charge_month, charge_year/.test(body);
  console.log(`  destructura del body:                 ${destructures ? "✅" : "❌"}`);
  console.log(`  valida rangos:                        ${validatesRange ? "✅" : "❌"}`);
  console.log(`  INSERT incluye charge_month/year:     ${insertsCols ? "✅" : "❌"}`);
  return { ok: destructures && validatesRange && insertsCols };
}

function check6UI() {
  console.log("\n=== 6. UI en Ingresos.tsx ===");
  const hasSchemaFields = /useCustomChargePeriod: z\.boolean\(\)\.default\(false\)/.test(INGRESOS)
    && /chargeMonth: z\.string\(\)\.optional\(\)/.test(INGRESOS)
    && /chargeYear: z\.string\(\)\.optional\(\)/.test(INGRESOS);
  const hasSuperRefine = /superRefine\(/.test(INGRESOS) && /Seleccione mes/.test(INGRESOS);
  const hasCheckbox = /data-testid="checkbox-custom-charge-period"/.test(INGRESOS);
  const hasMonthSelect = /data-testid="input-charge-month"/.test(INGRESOS);
  const hasYearSelect = /data-testid="input-charge-year"/.test(INGRESOS);
  const sendNullWhenOff = /useCustomChargePeriod && data\.chargeMonth \? Number\(data\.chargeMonth\) : null/.test(INGRESOS);
  const openEditMaps = /hasCustomCharge \? String\(income\.chargeMonth\) : ""/.test(INGRESOS);
  console.log(`  schema useCustomChargePeriod + month/year: ${hasSchemaFields ? "✅" : "❌"}`);
  console.log(`  superRefine validación:               ${hasSuperRefine ? "✅" : "❌"}`);
  console.log(`  Checkbox toggle:                      ${hasCheckbox ? "✅" : "❌"}`);
  console.log(`  Select mes:                           ${hasMonthSelect ? "✅" : "❌"}`);
  console.log(`  Select año:                           ${hasYearSelect ? "✅" : "❌"}`);
  console.log(`  envía null cuando toggle off:         ${sendNullWhenOff ? "✅" : "❌"}`);
  console.log(`  openEdit pre-carga del income:        ${openEditMaps ? "✅" : "❌"}`);
  return { ok: hasSchemaFields && hasSuperRefine && hasCheckbox && hasMonthSelect && hasYearSelect && sendNullWhenOff && openEditMaps };
}

function check7Migration() {
  console.log("\n=== 7. Migración db-push-manual.cjs ===");
  const hasAlter = /ALTER TABLE incomes ADD COLUMN IF NOT EXISTS charge_month integer/.test(MIGRATION)
    && /ALTER TABLE incomes ADD COLUMN IF NOT EXISTS charge_year integer/.test(MIGRATION);
  const hasVerifyMonth = /incomes\.charge_month/.test(MIGRATION) && /column_name='charge_month'/.test(MIGRATION);
  const hasVerifyYear = /incomes\.charge_year/.test(MIGRATION) && /column_name='charge_year'/.test(MIGRATION);
  console.log(`  ALTER TABLE charge_month + charge_year: ${hasAlter ? "✅" : "❌"}`);
  console.log(`  verification charge_month:            ${hasVerifyMonth ? "✅" : "❌"}`);
  console.log(`  verification charge_year:             ${hasVerifyYear ? "✅" : "❌"}`);
  return { ok: hasAlter && hasVerifyMonth && hasVerifyYear };
}

async function dbSanityCheck(client) {
  console.log("\n=== DB sanity (Neon) ===");
  const cols = await client.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='incomes'
      AND column_name IN ('charge_month','charge_year')
    ORDER BY column_name
  `);
  if (cols.rows.length === 0) {
    console.log("❌ Columnas charge_month/charge_year NO existen — corré scripts/db-push-manual.cjs");
    return { ok: false };
  }
  for (const c of cols.rows) {
    console.log(`  ${c.column_name}: type=${c.data_type} nullable=${c.is_nullable}`);
  }
  const allNullable = cols.rows.every((c) => c.is_nullable === "YES");
  const allInteger = cols.rows.every((c) => c.data_type === "integer");
  console.log(`  ambas nullable=YES: ${allNullable ? "✅" : "❌"}`);
  console.log(`  ambas type=integer: ${allInteger ? "✅" : "❌"}`);

  const counts = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE charge_month IS NOT NULL)::int AS with_charge,
      COUNT(*) FILTER (WHERE charge_month IS NULL)::int AS without_charge,
      COUNT(*)::int AS total
    FROM incomes
  `);
  const c = counts.rows[0];
  console.log(`  ingresos con charge_month seteado: ${c.with_charge} / ${c.total} (sin: ${c.without_charge})`);

  // Sanity: no debería haber filas donde solo uno de los dos esté seteado
  const inconsistent = await client.query(`
    SELECT COUNT(*)::int AS n FROM incomes
    WHERE (charge_month IS NULL) <> (charge_year IS NULL)
  `);
  console.log(`  filas con charge_month/year parciales (inconsistentes): ${inconsistent.rows[0].n} (esperado 0)`);

  return { ok: cols.rows.length === 2 && allNullable && allInteger && inconsistent.rows[0].n === 0 };
}

async function main() {
  const checks = {};
  checks.schema = check1Schema();
  checks.storage = check2StorageFilter();
  checks.routes = check3RoutesHelper();
  checks.webhook = check4Webhook();
  checks.split = check5Split();
  checks.ui = check6UI();
  checks.migration = check7Migration();

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(`SELECT current_database() AS db, current_user AS u`);
    console.log(`\n[verify-charge-month] connected db=${meta.rows[0].db} user=${meta.rows[0].u}`);
    checks.db = await dbSanityCheck(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n=== RESUMEN ===");
  console.log(`1. Schema:                  ${checks.schema.ok ? "✅" : "❌"}`);
  console.log(`2. Storage filter:          ${checks.storage.ok ? "✅" : "❌"}`);
  console.log(`3. Routes helper + sites:   ${checks.routes.ok ? "✅" : "❌"}`);
  console.log(`4. Webhook:                 ${checks.webhook.ok ? "✅" : "❌"}`);
  console.log(`5. Split:                   ${checks.split.ok ? "✅" : "❌"}`);
  console.log(`6. UI Ingresos.tsx:         ${checks.ui.ok ? "✅" : "❌"}`);
  console.log(`7. Migración:               ${checks.migration.ok ? "✅" : "❌"}`);
  console.log(`DB sanity:                  ${checks.db.ok ? "✅" : "❌"}`);
  console.log(`TypeScript:                 (correr 'npx tsc --noEmit')`);

  const allOk = Object.values(checks).every((c) => c.ok);
  if (!allOk) process.exit(2);
}

main().catch((e) => {
  console.error("[verify-charge-month] FATAL:", e);
  process.exit(1);
});
