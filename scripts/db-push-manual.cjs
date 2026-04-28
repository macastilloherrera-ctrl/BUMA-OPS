#!/usr/bin/env node
"use strict";

/**
 * Script manual de migración. Aplica los cambios de schema más recientes
 * usando pg directamente, evitando drizzle-kit. Idempotente: usá tantas
 * veces como necesites.
 *
 * Uso:
 *   DATABASE_URL="postgres://..." node scripts/db-push-manual.cjs
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[db-push-manual] FATAL: DATABASE_URL no está seteada en el ambiente actual");
  process.exit(1);
}

// Neon expone dos endpoints: el "-pooler" (pgbouncer, no acepta startup
// parameters como options=-c) y el directo (sí los acepta y permite
// SET session-level). Para este script forzamos conexión directa
// reemplazando "-pooler." por ".", sólo en memoria. Esto NO modifica
// la DATABASE_URL del runtime de la app.
const directUrl = process.env.DATABASE_URL.replace("-pooler.", ".");

let target;
try {
  const u = new URL(directUrl);
  target = `${u.host}/${u.pathname.slice(1)} as ${u.username}`;
  console.log(`[db-push-manual] target: ${target}`);
  console.log(`[db-push-manual] sslmode query param: ${u.searchParams.get("sslmode") || "(none)"}`);
  if (process.env.DATABASE_URL.includes("-pooler.")) {
    console.log(`[db-push-manual] note: original URL apuntaba al pooler; usando endpoint directo para este script`);
  }
} catch {
  console.error("[db-push-manual] DATABASE_URL malformada");
  process.exit(1);
}

// Conexión directa (no pooler). El search_path se setea explícitamente vía
// SET al inicio de cada conexión usada (ver main()), porque pgbouncer en
// modo transaction de Neon no soporta el startup parameter "options".
const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

// Cada step es { label, sql }. Los IF NOT EXISTS hacen que sea idempotente.
const STEPS = [
  {
    label: "enum closing_cycle_status",
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closing_cycle_status') THEN
          CREATE TYPE closing_cycle_status AS ENUM (
            'open','preparation','pending_info','pre_ready','under_review','approved','issued'
          );
        END IF;
      END $$;
    `,
  },
  {
    label: "enum closing_cycle_risk",
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closing_cycle_risk') THEN
          CREATE TYPE closing_cycle_risk AS ENUM ('low','medium','high');
        END IF;
      END $$;
    `,
  },
  {
    label: "expenses.exported_at column",
    sql: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exported_at timestamp;`,
  },
  {
    label: "monthly_closing_cycles table",
    sql: `
      CREATE TABLE IF NOT EXISTS monthly_closing_cycles (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id varchar NOT NULL,
        month integer NOT NULL,
        year integer NOT NULL,
        issue_day integer NOT NULL DEFAULT 10,
        cutoff_expenses_date timestamp,
        cutoff_incomes_date timestamp,
        pre_statement_date timestamp,
        final_issue_date timestamp,
        status closing_cycle_status NOT NULL DEFAULT 'open',
        risk closing_cycle_risk NOT NULL DEFAULT 'low',
        notes text,
        created_by varchar NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `,
  },
  {
    label: "monthly_closing_checklist_items table",
    sql: `
      CREATE TABLE IF NOT EXISTS monthly_closing_checklist_items (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_id varchar NOT NULL,
        label varchar(255) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        completed boolean NOT NULL DEFAULT false,
        completed_by varchar,
        completed_at timestamp
      );
    `,
  },
  {
    label: "monthly_closing_status_logs table",
    sql: `
      CREATE TABLE IF NOT EXISTS monthly_closing_status_logs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_id varchar NOT NULL,
        previous_status varchar(50),
        new_status varchar(50) NOT NULL,
        changed_by varchar NOT NULL,
        changed_by_name varchar(255),
        changed_at timestamp DEFAULT now()
      );
    `,
  },
  {
    label: "closing_cycle_global_config table",
    sql: `
      CREATE TABLE IF NOT EXISTS closing_cycle_global_config (
        id text PRIMARY KEY DEFAULT 'singleton',
        emission_day integer NOT NULL DEFAULT 25,
        expense_cutoff_day integer NOT NULL DEFAULT 18,
        income_cutoff_day integer NOT NULL DEFAULT 20,
        pre_state_day integer NOT NULL DEFAULT 22,
        final_emission_day integer NOT NULL DEFAULT 25,
        alert_days_before_deadline integer NOT NULL DEFAULT 2,
        alert_on_missing_cycle boolean NOT NULL DEFAULT true,
        created_by varchar NOT NULL,
        updated_at timestamp DEFAULT now(),
        updated_by varchar NOT NULL
      );
    `,
  },
  {
    label: "closing_cycle_building_override table",
    sql: `
      CREATE TABLE IF NOT EXISTS closing_cycle_building_override (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id varchar NOT NULL,
        month integer NOT NULL,
        year integer NOT NULL,
        emission_day integer,
        expense_cutoff_day integer,
        income_cutoff_day integer,
        pre_state_day integer,
        final_emission_day integer,
        reason text NOT NULL,
        created_by varchar NOT NULL,
        created_at timestamp DEFAULT now(),
        CONSTRAINT uq_override_building_period UNIQUE (building_id, month, year)
      );
    `,
  },
  // Columnas agregadas en el sweep de TypeScript (commit d8498f2).
  {
    label: "critical_assets.assigned_maintainer_id column",
    sql: `ALTER TABLE critical_assets ADD COLUMN IF NOT EXISTS assigned_maintainer_id varchar;`,
  },
  {
    label: "critical_assets.brand column",
    sql: `ALTER TABLE critical_assets ADD COLUMN IF NOT EXISTS brand varchar(255);`,
  },
  {
    label: "critical_assets.model column",
    sql: `ALTER TABLE critical_assets ADD COLUMN IF NOT EXISTS model varchar(255);`,
  },
  {
    label: "critical_assets.cost column",
    sql: `ALTER TABLE critical_assets ADD COLUMN IF NOT EXISTS cost decimal(12,2);`,
  },
  {
    label: "tickets.title column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS title varchar(255);`,
  },
  {
    label: "tickets.cost column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cost decimal(12,2);`,
  },
  {
    label: "tickets.due_date column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date timestamp;`,
  },
  {
    label: "tickets.resolved_at column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at timestamp;`,
  },
  {
    label: "tickets.assignment_history column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignment_history text;`,
  },
  {
    label: "tickets.escalation_reason column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_reason text;`,
  },
  {
    label: "tickets.escalated_to column",
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated_to varchar;`,
  },
  {
    label: "bank_transactions.updated_at column",
    sql: `ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS updated_at timestamp;`,
  },
];

// Verificaciones a correr al final (read-only) para confirmar que el schema
// quedó como esperamos.
const VERIFICATIONS = [
  {
    label: "expenses.exported_at",
    sql: `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'exported_at';
    `,
  },
  {
    label: "monthly_closing_cycles",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monthly_closing_cycles';`,
  },
  {
    label: "monthly_closing_checklist_items",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monthly_closing_checklist_items';`,
  },
  {
    label: "monthly_closing_status_logs",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monthly_closing_status_logs';`,
  },
  {
    label: "closing_cycle_global_config",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='closing_cycle_global_config';`,
  },
  {
    label: "closing_cycle_building_override",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='closing_cycle_building_override';`,
  },
  // Columnas del sweep de TypeScript (d8498f2)
  {
    label: "critical_assets.assigned_maintainer_id",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='critical_assets' AND column_name='assigned_maintainer_id';`,
  },
  {
    label: "critical_assets.brand",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='critical_assets' AND column_name='brand';`,
  },
  {
    label: "critical_assets.model",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='critical_assets' AND column_name='model';`,
  },
  {
    label: "critical_assets.cost",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='critical_assets' AND column_name='cost';`,
  },
  {
    label: "tickets.title",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='title';`,
  },
  {
    label: "tickets.cost",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='cost';`,
  },
  {
    label: "tickets.due_date",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='due_date';`,
  },
  {
    label: "tickets.resolved_at",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='resolved_at';`,
  },
  {
    label: "tickets.assignment_history",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='assignment_history';`,
  },
  {
    label: "tickets.escalation_reason",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='escalation_reason';`,
  },
  {
    label: "tickets.escalated_to",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='escalated_to';`,
  },
  {
    label: "bank_transactions.updated_at",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bank_transactions' AND column_name='updated_at';`,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    // Doble red de seguridad: setear search_path explícitamente además del
    // pool option, por si el cliente abrió antes de aplicar las options.
    await client.query("SET search_path TO public");

    // Confirmar conectividad y mostrar versión + base + search_path actual
    const meta = await client.query(
      `SELECT current_database() AS db, current_user AS usr, current_schema() AS schema, current_setting('search_path') AS search_path, version() AS ver`,
    );
    console.log(`[db-push-manual] connected: db=${meta.rows[0].db} user=${meta.rows[0].usr}`);
    console.log(`[db-push-manual] schema=${meta.rows[0].schema} search_path=${meta.rows[0].search_path}`);
    console.log(`[db-push-manual] server: ${meta.rows[0].ver.split(",")[0]}`);

    // Conteo de tablas — sanity check ("¿estoy en la base correcta?")
    const tableCount = await client.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'`,
    );
    console.log(`[db-push-manual] public tables before: ${tableCount.rows[0].n}`);

    let ok = 0;
    let failed = 0;
    for (const step of STEPS) {
      try {
        await client.query(step.sql);
        console.log(`  ✓ ${step.label}`);
        ok++;
      } catch (e) {
        console.error(`  ✗ ${step.label}: ${e.message}`);
        failed++;
      }
    }
    console.log(`[db-push-manual] applied: ok=${ok} failed=${failed}`);

    console.log(`[db-push-manual] verifying...`);
    let verifiedOk = 0;
    let verifiedMissing = 0;
    for (const v of VERIFICATIONS) {
      const { rows } = await client.query(v.sql);
      if (rows.length > 0) {
        console.log(`  ✓ ${v.label}`);
        verifiedOk++;
      } else {
        console.log(`  ✗ ${v.label} NOT FOUND`);
        verifiedMissing++;
      }
    }

    const tableCountAfter = await client.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'`,
    );
    console.log(`[db-push-manual] public tables after: ${tableCountAfter.rows[0].n}`);
    console.log(`[db-push-manual] done. verified ok=${verifiedOk} missing=${verifiedMissing}`);

    if (failed > 0 || verifiedMissing > 0) {
      process.exit(2);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[db-push-manual] FATAL:", e.message || e);
  process.exit(1);
});
