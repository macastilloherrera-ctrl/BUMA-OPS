#!/usr/bin/env node
"use strict";

/**
 * Verifica el sistema de webhooks de ingresos:
 *
 *   1. Schema:   tabla building_webhook_keys con columnas + unique en api_key
 *   2. Storage:  routes.ts contiene helper hashWebhookKey + rate limiter
 *   3. Endpoint super-admin POST /api/super-admin/webhook-keys
 *   4. Endpoint super-admin GET  /api/super-admin/webhook-keys
 *   5. Endpoint super-admin DEL  /api/super-admin/webhook-keys/:id
 *   6. Endpoint público POST /api/incomes/webhook (sin isAuthenticated)
 *   7. UI: tab "Webhooks" en SuperAdminPanel.tsx
 *   8. Migración: building_webhook_keys en scripts/db-push-manual.cjs
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/verify-webhook.cjs
 *
 * Patrón idéntico a scripts/verify-incomes-fixes.cjs. NO modifica datos.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  console.error("[verify-webhook] FATAL: DATABASE_URL no está seteada");
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

const ROOT = path.join(__dirname, "..");
const ROUTES = fs.readFileSync(path.join(ROOT, "server", "routes.ts"), "utf8");
const STORAGE = fs.readFileSync(path.join(ROOT, "server", "storage.ts"), "utf8");
const SCHEMA = fs.readFileSync(path.join(ROOT, "shared", "schema.ts"), "utf8");
const PANEL = fs.readFileSync(
  path.join(ROOT, "client", "src", "pages", "SuperAdminPanel.tsx"),
  "utf8",
);
const MIGRATION = fs.readFileSync(
  path.join(ROOT, "scripts", "db-push-manual.cjs"),
  "utf8",
);

function locate(text, needle) {
  const idx = text.indexOf(needle);
  if (idx < 0) return null;
  return text.slice(0, idx).split("\n").length;
}

function check1Schema() {
  console.log("\n=== 1. Schema en shared/schema.ts ===");
  const hasTable = /pgTable\("building_webhook_keys"/.test(SCHEMA);
  const hasFK = /references\(\(\) => buildings\.id\)/.test(SCHEMA);
  const hasUnique = /apiKey: varchar\("api_key", \{ length: 64 \}\)\.notNull\(\)\.unique\(\)/.test(SCHEMA);
  const exportsType = /export type BuildingWebhookKey/.test(SCHEMA) && /export type InsertBuildingWebhookKey/.test(SCHEMA);
  const hasRelation = /buildingWebhookKeysRelations/.test(SCHEMA);
  console.log(`  pgTable building_webhook_keys:  ${hasTable ? "✅" : "❌"}`);
  console.log(`  FK a buildings.id:              ${hasFK ? "✅" : "❌"}`);
  console.log(`  apiKey varchar(64) UNIQUE:      ${hasUnique ? "✅" : "❌"}`);
  console.log(`  tipos Insert/Select exportados: ${exportsType ? "✅" : "❌"}`);
  console.log(`  relations declarada:            ${hasRelation ? "✅" : "❌"}`);
  return { ok: hasTable && hasFK && hasUnique && exportsType && hasRelation };
}

function check2StorageAndHelpers() {
  console.log("\n=== 2. Storage CRUD + helpers en routes.ts ===");
  const storageMethods = [
    "listWebhookKeys",
    "getWebhookKeyById",
    "getWebhookKeyByHash",
    "createWebhookKey",
    "deactivateWebhookKey",
    "touchWebhookKey",
  ];
  const missing = storageMethods.filter((m) => !STORAGE.includes(`async ${m}(`));
  console.log(`  métodos storage (6):           ${missing.length === 0 ? "✅" : `❌ falta: ${missing.join(",")}`}`);

  const hasHash = /function hashWebhookKey\(plain: string\): string \{[\s\S]+?sha256/.test(ROUTES);
  const hasRateLimit = /function consumeWebhookRateLimit/.test(ROUTES) && /WEBHOOK_RATE_LIMIT\s*=\s*100/.test(ROUTES);
  const hasDateChile = /function parsePaymentDateChile/.test(ROUTES);
  console.log(`  hashWebhookKey SHA-256:        ${hasHash ? "✅" : "❌"}`);
  console.log(`  rate limit 100/min:            ${hasRateLimit ? "✅" : "❌"}`);
  console.log(`  parsePaymentDateChile:         ${hasDateChile ? "✅" : "❌"}`);
  return { ok: missing.length === 0 && hasHash && hasRateLimit && hasDateChile };
}

function check3SuperAdminEndpoints() {
  console.log("\n=== 3. Endpoints super-admin ===");
  const postLine = locate(ROUTES, 'app.post("/api/super-admin/webhook-keys"');
  const getLine = locate(ROUTES, 'app.get("/api/super-admin/webhook-keys"');
  const delLine = locate(ROUTES, 'app.delete("/api/super-admin/webhook-keys/:id"');
  console.log(`  POST  /api/super-admin/webhook-keys:    ${postLine ? `✅ L${postLine}` : "❌"}`);
  console.log(`  GET   /api/super-admin/webhook-keys:    ${getLine ? `✅ L${getLine}` : "❌"}`);
  console.log(`  DELETE /api/super-admin/webhook-keys/:id: ${delLine ? `✅ L${delLine}` : "❌"}`);

  // Validación de comportamiento clave por endpoint
  const postSlice = postLine ? ROUTES.slice(ROUTES.indexOf('app.post("/api/super-admin/webhook-keys"')) : "";
  const postBody = postSlice.slice(0, 4000);
  const restrictsToSuperAdmin = /profile\.role !== "super_admin"/.test(postBody);
  const generatesRandom = /crypto\.randomBytes\(32\)\.toString\("hex"\)/.test(postBody);
  const persistsHash = /apiKey:\s*hashedKey/.test(postBody);
  const returnsPlainOnce = /apiKey:\s*plainKey/.test(postBody) && /no se volverá a mostrar/.test(postBody);
  const auditCreate = /action:\s*"create_webhook_key"/.test(postBody);
  console.log(`    restringe a super_admin:               ${restrictsToSuperAdmin ? "✅" : "❌"}`);
  console.log(`    genera 32 bytes hex aleatorios:        ${generatesRandom ? "✅" : "❌"}`);
  console.log(`    persiste hash (no plano):              ${persistsHash ? "✅" : "❌"}`);
  console.log(`    retorna key plana UNA vez:             ${returnsPlainOnce ? "✅" : "❌"}`);
  console.log(`    audit create_webhook_key:              ${auditCreate ? "✅" : "❌"}`);

  const delSlice = delLine ? ROUTES.slice(ROUTES.indexOf('app.delete("/api/super-admin/webhook-keys/:id"')) : "";
  const delBody = delSlice.slice(0, 3000);
  const softDelete = /deactivateWebhookKey/.test(delBody);
  const auditRevoke = /action:\s*"revoke_webhook_key"/.test(delBody);
  console.log(`    DELETE es soft (isActive=false):       ${softDelete ? "✅" : "❌"}`);
  console.log(`    audit revoke_webhook_key:              ${auditRevoke ? "✅" : "❌"}`);

  return {
    ok: !!postLine && !!getLine && !!delLine && restrictsToSuperAdmin
      && generatesRandom && persistsHash && returnsPlainOnce && auditCreate
      && softDelete && auditRevoke,
  };
}

function check4WebhookEndpoint() {
  console.log("\n=== 4. POST /api/incomes/webhook (sin sesión) ===");
  const line = locate(ROUTES, 'app.post("/api/incomes/webhook"');
  if (!line) {
    console.log("❌ Endpoint no encontrado");
    return { ok: false };
  }
  console.log(`  endpoint en routes.ts:L${line} ✅`);

  // Verifica que NO use isAuthenticated en la firma
  const decl = ROUTES.slice(ROUTES.indexOf('app.post("/api/incomes/webhook"'),
    ROUTES.indexOf('app.post("/api/incomes/webhook"') + 300);
  const usesIsAuth = /isAuthenticated/.test(decl.split(",", 4).join(","));
  console.log(`  SIN middleware isAuthenticated:        ${!usesIsAuth ? "✅" : "❌"}`);

  const body = ROUTES.slice(ROUTES.indexOf('app.post("/api/incomes/webhook"'));
  const next = body.indexOf('// Vendor Directory');
  const handler = next > 0 ? body.slice(0, next) : body.slice(0, 8000);

  const readsHeader = /req\.header\("x-api-key"\)/.test(handler);
  const hashesHeader = /hashWebhookKey\(rawKey\)/.test(handler);
  const checksActive = /!keyRow\.isActive/.test(handler);
  const returns401 = /status\(401\)/.test(handler) && /API key inválida/.test(handler);
  const validatesZod = /bodySchema\.parse\(req\.body\)/.test(handler);
  const rateLimitUsed = /consumeWebhookRateLimit\(hashed\)/.test(handler);
  const returns429 = /status\(429\)/.test(handler);
  const consultsPayerDir = /storage\.getPayerDirectory\(keyRow\.buildingId\)/.test(handler);
  const statusByMatch = /matchedFromDirectory \? "identified" : "pending"/.test(handler);
  const touchesKey = /storage\.touchWebhookKey\(keyRow\.id\)/.test(handler);
  const auditAction = /action:\s*"create_income_webhook"/.test(handler);
  const usesChileDate = /parsePaymentDateChile/.test(handler);
  const cycleLock = /assertCycleNotLocked\(keyRow\.buildingId/.test(handler);

  console.log(`  lee header X-API-Key:                  ${readsHeader ? "✅" : "❌"}`);
  console.log(`  hashea header con SHA-256:             ${hashesHeader ? "✅" : "❌"}`);
  console.log(`  verifica isActive:                     ${checksActive ? "✅" : "❌"}`);
  console.log(`  responde 401 API key inválida:         ${returns401 ? "✅" : "❌"}`);
  console.log(`  zod valida body:                       ${validatesZod ? "✅" : "❌"}`);
  console.log(`  aplica rate limit por hash:            ${rateLimitUsed ? "✅" : "❌"}`);
  console.log(`  responde 429 si excede:                ${returns429 ? "✅" : "❌"}`);
  console.log(`  consulta payer_directory por buildingId: ${consultsPayerDir ? "✅" : "❌"}`);
  console.log(`  status=identified/pending por match:    ${statusByMatch ? "✅" : "❌"}`);
  console.log(`  actualiza lastUsedAt (touch):           ${touchesKey ? "✅" : "❌"}`);
  console.log(`  audit create_income_webhook:           ${auditAction ? "✅" : "❌"}`);
  console.log(`  paymentDate interpretado en CL:        ${usesChileDate ? "✅" : "❌"}`);
  console.log(`  respeta lockCheck del ciclo:           ${cycleLock ? "✅" : "❌"}`);

  return {
    ok: !usesIsAuth && readsHeader && hashesHeader && checksActive && returns401
      && validatesZod && rateLimitUsed && returns429 && consultsPayerDir
      && statusByMatch && touchesKey && auditAction && usesChileDate && cycleLock,
  };
}

function check5UI() {
  console.log("\n=== 5. UI tab Webhooks en SuperAdminPanel.tsx ===");
  const hasTrigger = /data-testid="tab-webhooks"/.test(PANEL);
  const hasContent = /<TabsContent value="webhooks"/.test(PANEL);
  const hasListQuery = /\["\/api\/super-admin\/webhook-keys"\]/.test(PANEL);
  const hasCreateMutation = /createWebhookKeyMutation/.test(PANEL);
  const hasRevokeMutation = /revokeWebhookKeyMutation/.test(PANEL);
  const hasShowDialog = /data-testid="dialog-webhook-key-created"/.test(PANEL);
  const hasCopyButton = /data-testid="button-copy-webhook-key"/.test(PANEL);
  const hasWarning = /no se volverá a mostrar/i.test(PANEL);
  console.log(`  TabsTrigger tab-webhooks:           ${hasTrigger ? "✅" : "❌"}`);
  console.log(`  TabsContent value=webhooks:         ${hasContent ? "✅" : "❌"}`);
  console.log(`  useQuery /api/super-admin/webhook-keys: ${hasListQuery ? "✅" : "❌"}`);
  console.log(`  createWebhookKeyMutation:           ${hasCreateMutation ? "✅" : "❌"}`);
  console.log(`  revokeWebhookKeyMutation:           ${hasRevokeMutation ? "✅" : "❌"}`);
  console.log(`  Dialog post-creación:               ${hasShowDialog ? "✅" : "❌"}`);
  console.log(`  Botón Copiar:                       ${hasCopyButton ? "✅" : "❌"}`);
  console.log(`  Aviso "no se volverá a mostrar":    ${hasWarning ? "✅" : "❌"}`);
  return { ok: hasTrigger && hasContent && hasListQuery && hasCreateMutation && hasRevokeMutation && hasShowDialog && hasCopyButton && hasWarning };
}

function check6Migration() {
  console.log("\n=== 6. Migración db-push-manual.cjs ===");
  const hasCreate = /CREATE TABLE IF NOT EXISTS building_webhook_keys/.test(MIGRATION);
  const hasFK = /REFERENCES buildings\(id\)/.test(MIGRATION);
  const hasUnique = /api_key varchar\(64\) NOT NULL UNIQUE/.test(MIGRATION);
  const hasVerification = /building_webhook_keys table exists/.test(MIGRATION);
  console.log(`  CREATE TABLE IF NOT EXISTS:         ${hasCreate ? "✅" : "❌"}`);
  console.log(`  FK building_id → buildings(id):     ${hasFK ? "✅" : "❌"}`);
  console.log(`  UNIQUE en api_key:                  ${hasUnique ? "✅" : "❌"}`);
  console.log(`  verification step:                  ${hasVerification ? "✅" : "❌"}`);
  return { ok: hasCreate && hasFK && hasUnique && hasVerification };
}

async function dbSanityCheck(client) {
  console.log("\n=== DB sanity (Neon) ===");

  const tbl = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='building_webhook_keys'
  `);
  const tableExists = tbl.rows.length > 0;
  console.log(`  tabla building_webhook_keys existe: ${tableExists ? "✅" : "❌ — corré scripts/db-push-manual.cjs"}`);

  if (!tableExists) return { ok: false };

  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='building_webhook_keys'
  `);
  const colSet = new Set(cols.rows.map((r) => r.column_name));
  const needed = ["id", "building_id", "api_key", "description", "is_active", "last_used_at", "created_at", "created_by"];
  const missing = needed.filter((c) => !colSet.has(c));
  console.log(`  columnas requeridas (8):            ${missing.length === 0 ? "✅" : `❌ falta: ${missing.join(",")}`}`);

  const uniq = await client.query(`
    SELECT 1 FROM pg_indexes WHERE schemaname='public'
      AND tablename='building_webhook_keys'
      AND indexdef ILIKE '%UNIQUE%api_key%'
  `);
  console.log(`  UNIQUE en api_key:                  ${uniq.rows.length > 0 ? "✅" : "❌"}`);

  const count = await client.query(`SELECT COUNT(*)::int AS n FROM building_webhook_keys`);
  console.log(`  filas actuales:                     ${count.rows[0].n}`);

  // Sanity: api_key tiene 64 chars (SHA-256 hex)
  const lens = await client.query(`
    SELECT char_length(api_key) AS len FROM building_webhook_keys LIMIT 5
  `);
  for (const r of lens.rows) {
    console.log(`    api_key.len=${r.len} (esperado 64)`);
  }

  return { ok: missing.length === 0 && uniq.rows.length > 0 };
}

async function main() {
  const checks = {};
  checks.schema = check1Schema();
  checks.storage = check2StorageAndHelpers();
  checks.superAdmin = check3SuperAdminEndpoints();
  checks.webhook = check4WebhookEndpoint();
  checks.ui = check5UI();
  checks.migration = check6Migration();

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    const meta = await client.query(`SELECT current_database() AS db, current_user AS u`);
    console.log(`\n[verify-webhook] connected db=${meta.rows[0].db} user=${meta.rows[0].u}`);
    checks.db = await dbSanityCheck(client);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n=== RESUMEN ===");
  console.log(`1. Schema:                  ${checks.schema.ok ? "✅" : "❌"}`);
  console.log(`2. Storage + helpers:       ${checks.storage.ok ? "✅" : "❌"}`);
  console.log(`3. Endpoints super-admin:   ${checks.superAdmin.ok ? "✅" : "❌"}`);
  console.log(`4. POST /api/incomes/webhook: ${checks.webhook.ok ? "✅" : "❌"}`);
  console.log(`5. UI Webhooks tab:         ${checks.ui.ok ? "✅" : "❌"}`);
  console.log(`6. Migración:               ${checks.migration.ok ? "✅" : "❌"}`);
  console.log(`DB sanity:                  ${checks.db.ok ? "✅" : "❌"}`);
  console.log(`TypeScript:                 (correr 'npx tsc --noEmit')`);

  const allOk = Object.values(checks).every((c) => c.ok);
  if (!allOk) process.exit(2);
}

main().catch((e) => {
  console.error("[verify-webhook] FATAL:", e);
  process.exit(1);
});
