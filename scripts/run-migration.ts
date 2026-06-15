/**
 * Apply one or more SQL migration files to the Supabase Postgres DB.
 *
 * supabase-js can't run DDL, so this connects directly with `pg` using a
 * Postgres connection URI. Add it to .env.local from the Supabase dashboard:
 *   Project Settings → Database → Connection string → URI
 * as one of: SUPABASE_DB_URL | DATABASE_URL | POSTGRES_URL (incl. the password).
 *
 * Run:
 *   pnpm tsx scripts/run-migration.ts supabase/migrations/20260615_form_builder.sql
 *   pnpm tsx scripts/run-migration.ts            # defaults to the form_builder migration
 *
 * The whole file runs in a single transaction; idempotent migrations (IF NOT
 * EXISTS / ADD COLUMN IF NOT EXISTS) are safe to re-run.
 */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const CONN =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!CONN) {
  console.error(
    "Missing Postgres connection string. Add SUPABASE_DB_URL (or DATABASE_URL) " +
      "to .env.local — Supabase → Project Settings → Database → Connection string → URI."
  );
  process.exit(1);
}

const files =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["supabase/migrations/20260615_form_builder.sql"];

async function main() {
  const client = new Client({
    connectionString: CONN,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const file of files) {
      const sql = await readFile(resolve(process.cwd(), file), "utf8");
      console.log(`Applying ${file} …`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    }
    console.log("\nAll migrations applied.");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Migration failed (rolled back):", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
