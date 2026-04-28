import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err);
});

export const db = drizzle(pool, { schema });

// Garantiza que la tabla de sesiones de connect-pg-simple existe.
// Necesario en Neon/Railway porque getSession() está configurado con
// createTableIfMissing: false. Se reserva un client del pool y se setea
// search_path=public a nivel de sesión antes del CREATE TABLE — el pool
// puede ir vía pgbouncer (Neon -pooler), donde startup options no aplican.
export async function ensureSessionsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO public");
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
    `);
    console.log("[boot] sessions table ready");
  } finally {
    client.release();
  }
}
