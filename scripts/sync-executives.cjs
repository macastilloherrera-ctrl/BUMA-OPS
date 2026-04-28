#!/usr/bin/env node
"use strict";

/**
 * Hace login con credenciales reales y dispara la sincronización
 * user_profiles → executives en producción.
 *
 * Uso por defecto (apunta a Railway prod):
 *   node scripts/sync-executives.cjs
 *
 * Override por env vars:
 *   BASE_URL=https://buma-ops-staging.up.railway.app \
 *   LOGIN_EMAIL=otro@buma.cl \
 *   LOGIN_PASSWORD=*** \
 *   node scripts/sync-executives.cjs
 *
 * Nota: usa /api/auth/login (email + password con bcrypt). El endpoint
 * /api/dev-auth/login NO acepta password, solo userId contra DEV_USERS.
 */

const BASE_URL = process.env.BASE_URL || "https://buma-ops-production.up.railway.app";
const EMAIL = process.env.LOGIN_EMAIL || "adminops@buma.cl";
const PASSWORD = process.env.LOGIN_PASSWORD || "Adminops2026";

async function main() {
  console.log(`[sync-executives] target: ${BASE_URL}`);
  console.log(`[sync-executives] login: ${EMAIL}`);

  // 1) Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error(`[sync-executives] FATAL: login failed (${loginRes.status}): ${body}`);
    process.exit(1);
  }

  const loginBody = await loginRes.json();
  console.log(`[sync-executives] logged in as ${loginBody.user?.email} role=${loginBody.role}`);

  // 2) Capturar cookie de sesión.
  // getSetCookie() (Node 20+) preserva cada Set-Cookie como string separado,
  // a diferencia de get("set-cookie") que las concatena con coma — lo cual
  // rompe el parseo cuando una cookie tiene "Expires=Thu, ..." adentro.
  const rawCookies =
    typeof loginRes.headers.getSetCookie === "function"
      ? loginRes.headers.getSetCookie()
      : (loginRes.headers.raw && loginRes.headers.raw()["set-cookie"]) || [];

  if (!rawCookies || rawCookies.length === 0) {
    console.error("[sync-executives] FATAL: no Set-Cookie en respuesta de login");
    process.exit(2);
  }

  const cookieHeader = rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
  const previewName = cookieHeader.split("=")[0] || "(unknown)";
  console.log(`[sync-executives] session cookie captured (${previewName}=...)`);

  // 3) Llamar sync
  const syncRes = await fetch(`${BASE_URL}/api/super-admin/sync-executives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: "{}",
  });

  const syncText = await syncRes.text();
  let parsed;
  try {
    parsed = JSON.parse(syncText);
  } catch {
    parsed = syncText;
  }

  if (!syncRes.ok) {
    console.error(`[sync-executives] sync respondió ${syncRes.status}:`);
    console.error(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
    process.exit(3);
  }

  console.log(`[sync-executives] sync OK (${syncRes.status}):`);
  console.log(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
}

main().catch((e) => {
  console.error("[sync-executives] FATAL:", e.message || e);
  process.exit(1);
});
