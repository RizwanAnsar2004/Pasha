// One-time migration script: copy startupconnect.pk logos to Supabase Storage.
import { createClient } from "@supabase/supabase-js";
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "logos";
const PREFIX = "databank";
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 15_000;
const SUPABASE_HOST = new URL(SUPABASE_URL).host;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const limitArg = [...args].find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

type Row = { id: string; startup_name: string; logo_url: string | null };

function extFromContentType(ct: string): string {
  const t = ct.toLowerCase().split(";")[0].trim();
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "image/svg+xml") return "svg";
  return "bin";
}

function extFromUrl(u: string): string | null {
  const m = u.match(/\.(jpe?g|png|webp|gif|svg)(?:$|\?)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : null;
}

async function fetchImage(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PSEC-Logo-Migration/1.0 (+https://pasha-startup-platform.vercel.app)",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 64 || ab.byteLength > 5 * 1024 * 1024) return null;
    return { buf: Buffer.from(ab), contentType: ct };
  } catch {
    return null;
  }
}

async function uploadAndUpdate(row: Row): Promise<"ok" | "skip" | "fail"> {
  if (!row.logo_url) return "skip";
  const src = row.logo_url.trim();
  if (!src || src.toUpperCase() === "NULL") return "skip";

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return "skip";
  }
  if (parsed.host === SUPABASE_HOST) return "skip"; // already migrated

  const fetched = await fetchImage(parsed.toString());
  if (!fetched) return "fail";

  const ext = extFromUrl(parsed.pathname) ?? extFromContentType(fetched.contentType);
  const key = `${PREFIX}/${row.id}.${ext}`;

  if (dryRun) {
    return "ok";
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, fetched.buf, {
      contentType: fetched.contentType,
      cacheControl: "31536000",
      upsert: true,
    });
  if (upErr) {
    return "fail";
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  const publicUrl = pub.publicUrl;

  const { error: updErr } = await supabase
    .from("databank")
    .update({ logo_url: publicUrl })
    .eq("id", row.id);
  if (updErr) {
    return "fail";
  }

  return "ok";
}

async function main() {
  console.log(`Loading databank rows with non-null logo_url${dryRun ? " (dry run)" : ""}…`);

  const allRows: Row[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("databank")
      .select("id, startup_name, logo_url")
      .not("logo_url", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const rows = allRows
    .filter((r) => {
      const v = r.logo_url?.trim();
      if (!v || v.toUpperCase() === "NULL") return false;
      try {
        const u = new URL(v);
        return u.host !== SUPABASE_HOST;
      } catch {
        return false;
      }
    })
    .slice(0, limit === Infinity ? undefined : limit);

  console.log(`Plan: migrate ${rows.length} of ${allRows.length} eligible rows.`);

  const failedPath = resolve(process.cwd(), "scripts/migrate-logos.failed.json");
  const failed: Array<{ id: string; startup_name: string; logo_url: string }> = [];
  let ok = 0;
  let skip = 0;
  let fail = 0;
  let done = 0;

  // Resume support: load prior failures so a re-run focuses on them if --retry.
  if (existsSync(failedPath)) {
    try {
      const prior = JSON.parse(await readFile(failedPath, "utf8"));
      console.log(`(Prior run had ${Array.isArray(prior) ? prior.length : "?"} failures recorded.)`);
    } catch {}
  }

  async function worker(slice: Row[]) {
    for (const row of slice) {
      const result = await uploadAndUpdate(row);
      if (result === "ok") ok++;
      else if (result === "skip") skip++;
      else {
        fail++;
        failed.push({ id: row.id, startup_name: row.startup_name, logo_url: row.logo_url ?? "" });
      }
      done++;
      if (done % 25 === 0 || done === rows.length) {
        process.stdout.write(
          `\r  progress: ${done}/${rows.length}  ok=${ok}  fail=${fail}  skip=${skip}     `
        );
      }
    }
  }

  // Split rows into CONCURRENCY chunks and run in parallel
  const chunks: Row[][] = Array.from({ length: CONCURRENCY }, () => []);
  rows.forEach((r, i) => chunks[i % CONCURRENCY].push(r));
  await Promise.all(chunks.map(worker));

  process.stdout.write("\n");
  console.log(`\nDone. ok=${ok} fail=${fail} skip=${skip}`);

  if (failed.length) {
    await writeFile(failedPath, JSON.stringify(failed, null, 2));
    console.log(`Wrote ${failed.length} failures to ${failedPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
