/**
 * QA helper — create applications from JSON instead of filling the form by hand.
 *
 *   npx tsx scripts/fill-application.ts qa/startups.json
 *   npx tsx scripts/fill-application.ts qa/startups.json --headed
 *   npx tsx scripts/fill-application.ts qa/one.json --base-url http://localhost:3000
 *
 * How it works
 * ------------
 * Each record is one application. Because /api/submit ties a submission to the
 * signed-in applicant — and re-submitting UPDATES that user's existing row
 * rather than adding another — every record needs its own applicant account.
 * The script provisions one per record (service role, auto-confirmed), signs in
 * through the real login page with Playwright, then POSTs the record to
 * /api/submit from inside that browser session. So scoring, emails and databank
 * routing all run exactly as they would for a real applicant.
 *
 * JSON shape: a single object, or an array of them. Keys are form `field_key`s.
 * An optional `__account` block overrides the generated credentials:
 *
 *   {
 *     "__account": { "email": "qa-atlas@yopmail.com", "password": "Passw0rd!23" },
 *     "startup_name": "AtlasCloud",
 *     ...
 *   }
 *
 * Flags
 *   --base-url <url>   target app (default $BASE_URL, else http://localhost:3000)
 *   --headed           watch the browser work
 *   --password <pw>    password for generated accounts (default $QA_PASSWORD)
 *   --dry-run          validate and report, create nothing
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser } from "@playwright/test";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

type Record_ = Record<string, unknown> & {
  __account?: { email?: string; password?: string };
};

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);

function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}
function opt(name: string, fallback?: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

// Options that take a value, so their value isn't mistaken for the fixture path.
const VALUE_FLAGS = new Set(["--base-url", "--password"]);

function positional(): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (VALUE_FLAGS.has(a)) i++; // skip its value
      continue;
    }
    return a;
  }
  return undefined;
}

const fixturePath = positional();
const baseUrl = (opt("base-url", process.env.BASE_URL) ?? "http://localhost:3000").replace(/\/$/, "");
const defaultPassword = opt("password", process.env.QA_PASSWORD) ?? "QaPassw0rd!2026";
const headed = flag("headed");
const dryRun = flag("dry-run");

if (!fixturePath) {
  console.error("Usage: npx tsx scripts/fill-application.ts <fixture.json> [--base-url url] [--headed] [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------- supabase

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ---------------------------------------------------------------- helpers

function slugify(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v : "";
  const out = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return out || fallback;
}

// Create the applicant account (or reset its password if it already exists), so
// the same fixture can be re-run without manual cleanup.
async function ensureAccount(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "applicant", seeded_by: "fill-application" },
  });

  if (!error && data.user) return;

  const alreadyExists = /already|registered|exists/i.test(error?.message ?? "");
  if (!alreadyExists) throw new Error(`createUser failed: ${error?.message}`);

  // Find the existing user and force the password we're about to sign in with.
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!existing) throw new Error(`user ${email} exists but could not be found`);
  const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updErr) throw new Error(`updateUser failed: ${updErr.message}`);
}

async function submitAs(
  browser: Browser,
  email: string,
  password: string,
  payload: Record<string, unknown>
): Promise<{ ok: true; tier?: string; score?: number; id?: string } | { ok: false; error: string }> {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  try {
    await page.goto("/apply/login", { waitUntil: "domcontentloaded" });

    // The login form is the only email+password pair on this page.
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();

    // Landing on the portal means the session cookie is set.
    await page.waitForURL(/\/apply(\?|$|\/)/, { timeout: 20_000 });

    const res = await page.request.post("/api/submit", { data: payload });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok()) {
      return { ok: false, error: String(body.error ?? `HTTP ${res.status()}`) };
    }
    return {
      ok: true,
      tier: body.tier as string | undefined,
      score: body.score as number | undefined,
      id: body.id as string | undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const raw = readFileSync(resolve(process.cwd(), fixturePath!), "utf8");
  const parsed = JSON.parse(raw) as Record_ | Record_[];
  const records = Array.isArray(parsed) ? parsed : [parsed];

  console.log(`\n  ${records.length} record${records.length === 1 ? "" : "s"} → ${baseUrl}`);
  if (dryRun) console.log("  (dry run — nothing will be created)\n");
  else console.log("");

  let created = 0;
  let failed = 0;

  const browser = dryRun ? null : await chromium.launch({ headless: !headed });

  for (const [i, record] of records.entries()) {
    const { __account, ...payload } = record;
    const name = slugify(payload.startup_name, `record-${i + 1}`);
    const email = (__account?.email ?? `qa+${name}@yopmail.com`).toLowerCase();
    const password = __account?.password ?? defaultPassword;

    if (dryRun) {
      console.log(`  · ${name.padEnd(24)} would sign in as ${email}`);
      continue;
    }

    try {
      await ensureAccount(email, password);
      const result = await submitAs(browser!, email, password, payload);
      if (result.ok) {
        created++;
        const detail = result.tier ? `${result.tier} (score ${result.score ?? "?"})` : "submitted";
        console.log(`  ✓ ${name.padEnd(24)} ${detail}`);
        console.log(`    ${email} / ${password}`);
      } else {
        failed++;
        console.log(`  ✗ ${name.padEnd(24)} ${result.error}`);
      }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${name.padEnd(24)} ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await browser?.close();

  if (!dryRun) {
    console.log(`\n  ${created} created, ${failed} failed\n`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
