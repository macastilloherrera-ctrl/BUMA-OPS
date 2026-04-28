import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// LOG TEMPORAL — confirmar contra qué host se conecta drizzle-kit.
// Quitar una vez que se diagnostique el problema "relation does not exist".
try {
  const u = new URL(process.env.DATABASE_URL);
  console.log(`[drizzle-kit] target: host=${u.host} db=${u.pathname.slice(1)} user=${u.username} ssl=${u.searchParams.get("sslmode") || "(none)"}`);
} catch {
  console.log("[drizzle-kit] DATABASE_URL is malformed");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
