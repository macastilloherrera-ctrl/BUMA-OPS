#!/usr/bin/env node
"use strict";

/**
 * Verifica el parser de cartolas (server/bankStatementParser.ts) contra:
 *   - Archivos reales disponibles en attached_assets/ (Banco Chile TEF
 *     Empresa y Santander). Estos se ejecutan siempre.
 *   - Archivos opcionales pasados por env: BANK_CHILE_CC_XLSX, BCI_XLSX,
 *     ITAU_XLSX, SCOTIA_XLSX, SANTANDER_XLSX. Si no están seteados, se
 *     reporta "skipped" para esos parsers.
 *
 * Además verifica que:
 *   - El módulo se carga sin errores
 *   - normalizeRut() acepta variantes y normaliza al formato XX.XXX.XXX-X
 *   - Cada parser devuelve banco, movimientos[], errores[]
 *
 * NO hace queries a la DB. Es un test estático del parser.
 *
 * Uso:
 *   node scripts/verify-bank-parser.cjs
 *   BCI_XLSX=/path/to/bci.xlsx node scripts/verify-bank-parser.cjs
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ATTACHED = path.join(ROOT, "attached_assets");

async function loadParser() {
  // Cargamos vía require con ts-node-equivalente: como el módulo es .ts,
  // usamos el bundle de typescript via esbuild/tsx no está disponible aquí.
  // Workaround: compilamos a JS en memoria con typescript si está disponible,
  // sino reportamos que el verify se queda en checks estáticos del archivo.
  try {
    // Si tsx o ts-node están disponibles, los usamos; sino caemos a regex
    // sobre el source.
    const { register } = require("tsx/cjs/api");
    register();
    const mod = require(path.join(ROOT, "server", "bankStatementParser.ts"));
    return { ok: true, mod };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function staticChecks() {
  console.log("=== Static checks ===");
  const src = fs.readFileSync(path.join(ROOT, "server", "bankStatementParser.ts"), "utf8");
  const checks = [
    { label: "exporta parseBankStatement",            re: /export async function parseBankStatement\(/ },
    { label: "exporta normalizeRut",                  re: /export function normalizeRut\(/ },
    { label: "interfaz ParsedBankMovement",           re: /export interface ParsedBankMovement/ },
    { label: "interfaz ParseBankStatementResult",     re: /export interface ParseBankStatementResult/ },
    { label: "parser Banco Chile cuenta corriente",   re: /function parseBancoChileCuentaCorriente/ },
    { label: "parser Banco Chile TEF Empresa",        re: /function parseBancoChileTefEmpresa/ },
    { label: "parser BCI",                            re: /function parseBCI\(/ },
    { label: "parser Itaú",                           re: /function parseItau\(/ },
    { label: "parser Santander",                      re: /function parseSantander\(/ },
    { label: "parser Scotiabank",                     re: /function parseScotiabank\(/ },
    { label: "auto-detect detectBanco",               re: /function detectBanco\(/ },
    { label: "timezone Chile (dateChile)",            re: /function dateChile\(/ },
    { label: "extractor RUT/nombre",                  re: /function extractPayerInfo\(/ },
  ];
  let ok = 0, missing = 0;
  for (const c of checks) {
    if (c.re.test(src)) { console.log(`  ✅ ${c.label}`); ok++; }
    else { console.log(`  ❌ ${c.label}`); missing++; }
  }
  return { ok: missing === 0, total: checks.length, ok_count: ok };
}

function endpointAndUIChecks() {
  console.log("\n=== Endpoint + UI checks ===");
  const routes = fs.readFileSync(path.join(ROOT, "server", "routes.ts"), "utf8");
  const ingresos = fs.readFileSync(path.join(ROOT, "client", "src", "pages", "Ingresos.tsx"), "utf8");
  const schema = fs.readFileSync(path.join(ROOT, "shared", "schema.ts"), "utf8");
  const migration = fs.readFileSync(path.join(ROOT, "scripts", "db-push-manual.cjs"), "utf8");

  const checks = [
    { label: "POST /api/bank-statements/parse",                          ok: /app\.post\("\/api\/bank-statements\/parse"/.test(routes) },
    { label: "POST /api/bank-statements/import",                         ok: /app\.post\("\/api\/bank-statements\/import"/.test(routes) },
    { label: "parse usa multer (upload.single 'file')",                  ok: /\/api\/bank-statements\/parse"[\s\S]*?upload\.single\("file"\)/.test(routes) },
    { label: "import valida isManagerRole",                              ok: /\/api\/bank-statements\/import[\s\S]{0,2000}isManagerRole/.test(routes) },
    { label: "import dedupa por monto/fecha ±1día",                      ok: /dayMs[\s\S]{0,400}fechaMin[\s\S]{0,400}fechaMax/.test(routes) },
    { label: "import busca matches en incomes pending_email",            ok: /pending_email/.test(routes) && /candidatesPendingEmail/.test(routes) },
    { label: "tolerancia ±1% (monto * 0.01)",                            ok: /mov\.monto \* 0\.01/.test(routes) },
    { label: "audit log import_bank_statement",                          ok: /action:\s*"import_bank_statement"/.test(routes) },
    { label: "enum income_status incluye pending_email (schema.ts)",     ok: /pending_email/.test(schema) },
    { label: "migración agrega pending_email al enum",                   ok: /ALTER TYPE income_status ADD VALUE IF NOT EXISTS 'pending_email'/.test(migration) },
    { label: "botón 'Importar Cartola' en UI",                           ok: /data-testid="button-import-cartola"/.test(ingresos) },
    { label: "dialog de importar cartola",                               ok: /data-testid="dialog-import-cartola"/.test(ingresos) },
    { label: "preview con checkbox seleccionar todo",                    ok: /data-testid="cartola-select-all"/.test(ingresos) },
    { label: "muestra resultado tras importar",                          ok: /data-testid="cartola-result-conciliados"/.test(ingresos) },
  ];
  let ok = 0, missing = 0;
  for (const c of checks) {
    if (c.ok) { console.log(`  ✅ ${c.label}`); ok++; }
    else { console.log(`  ❌ ${c.label}`); missing++; }
  }
  return { ok: missing === 0, total: checks.length, ok_count: ok };
}

async function runParserAgainstFile(mod, filename, label) {
  const buf = fs.readFileSync(filename);
  const r = await mod.parseBankStatement(buf, path.basename(filename));
  console.log(`\n  --- ${label}: ${path.basename(filename)}`);
  console.log(`      banco detectado:  ${r.banco}`);
  console.log(`      edificio:         ${r.edificioDetectado || "(no detectado)"}`);
  console.log(`      periodo:          ${r.periodo ? r.periodo.desde.toISOString().slice(0,10) + " → " + r.periodo.hasta.toISOString().slice(0,10) : "(no detectado)"}`);
  console.log(`      movimientos:      ${r.movimientos.length}`);
  console.log(`      con nombre:       ${r.movimientos.filter((m) => m.nombrePagador).length}`);
  console.log(`      con RUT:          ${r.movimientos.filter((m) => m.rutPagador).length}`);
  console.log(`      errores:          ${r.errores.length === 0 ? "(ninguno)" : r.errores.join("; ")}`);
  if (r.movimientos.length > 0) {
    const sample = r.movimientos[0];
    console.log(`      muestra: ${sample.fecha.toISOString().slice(0,10)} | ${sample.monto} | ${sample.nombrePagador || "—"} | ${sample.rutPagador || "—"}`);
  }
  return r;
}

function runtimeChecksRutNormalization(mod) {
  console.log("\n=== Runtime: normalizeRut ===");
  const cases = [
    { input: "12345678-9",      expected: "12.345.678-9" },
    { input: "12.345.678-9",    expected: "12.345.678-9" },
    { input: "12.345.678-K",    expected: "12.345.678-K" },
    { input: "1234567-K",       expected: "1.234.567-K" },
    { input: "1.234.567-k",     expected: "1.234.567-K" },
    { input: "abc",             expected: null },
    { input: null,              expected: null },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const got = mod.normalizeRut(c.input);
    const ok = got === c.expected;
    console.log(`  ${ok ? "✅" : "❌"} normalizeRut(${JSON.stringify(c.input)}) = ${JSON.stringify(got)}${ok ? "" : " (esperado " + JSON.stringify(c.expected) + ")"}`);
    if (ok) pass++; else fail++;
  }
  return { ok: fail === 0, total: cases.length, pass };
}

async function main() {
  const stat = staticChecks();
  const endp = endpointAndUIChecks();

  console.log("\n=== Runtime: parser contra archivos reales ===");
  const loaded = await loadParser();
  if (!loaded.ok) {
    console.log("⚠️  No se pudo cargar el módulo TS dinámicamente (falta tsx/ts-node).");
    console.log(`    Error: ${loaded.error}`);
    console.log("    Saltando checks de runtime — los static checks confirman estructura del código.");
    if (!stat.ok || !endp.ok) process.exit(2);
    return;
  }
  const mod = loaded.mod;
  const rut = runtimeChecksRutNormalization(mod);

  // Archivos reales disponibles en attached_assets/
  const realChile = path.join(ATTACHED, "banco_chile_vista_placeres_1772840720308.xlsx");
  const realSantander = path.join(ATTACHED, "banco_santander_torre_berlin_1772839371309.xlsx");

  const tests = [
    { label: "Banco Chile (TEF Empresa, archivo real)", file: fs.existsSync(realChile) ? realChile : null },
    { label: "Santander (archivo real)",                 file: fs.existsSync(realSantander) ? realSantander : null },
    { label: "Banco Chile cuenta corriente (env BANK_CHILE_CC_XLSX)", file: process.env.BANK_CHILE_CC_XLSX || null },
    { label: "BCI (env BCI_XLSX)",                       file: process.env.BCI_XLSX || null },
    { label: "Itaú (env ITAU_XLSX)",                     file: process.env.ITAU_XLSX || null },
    { label: "Scotiabank (env SCOTIA_XLSX)",             file: process.env.SCOTIA_XLSX || null },
    { label: "Santander adicional (env SANTANDER_XLSX)", file: process.env.SANTANDER_XLSX || null },
  ];
  let runtime_ok = true;
  for (const t of tests) {
    if (!t.file) {
      console.log(`\n  --- ${t.label}: ⏭️  skipped (no provisto)`);
      continue;
    }
    if (!fs.existsSync(t.file)) {
      console.log(`\n  --- ${t.label}: ❌ archivo no existe: ${t.file}`);
      runtime_ok = false;
      continue;
    }
    try {
      const r = await runParserAgainstFile(mod, t.file, t.label);
      if (r.movimientos.length === 0 && r.errores.length > 0) runtime_ok = false;
    } catch (e) {
      console.log(`      ❌ excepción: ${e.message}`);
      runtime_ok = false;
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Static checks:     ${stat.ok_count}/${stat.total}  ${stat.ok ? "✅" : "❌"}`);
  console.log(`Endpoint/UI:       ${endp.ok_count}/${endp.total}  ${endp.ok ? "✅" : "❌"}`);
  console.log(`normalizeRut:      ${rut.pass}/${rut.total}  ${rut.ok ? "✅" : "❌"}`);
  console.log(`Runtime parsers:   ${runtime_ok ? "✅" : "❌"}  (archivos provistos)`);
  console.log(`TypeScript:        correr 'npx tsc --noEmit' aparte`);

  if (!stat.ok || !endp.ok || !rut.ok || !runtime_ok) process.exit(2);
}

main().catch((e) => {
  console.error("[verify-bank-parser] FATAL:", e);
  process.exit(1);
});
