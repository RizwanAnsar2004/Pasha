/**
 * Retry pass for migrate-logos.failed.json.
 *
 * For each prior failure:
 *  - HEAD the URL once.
 *  - If 200, run the same migration logic (download, upload, update DB).
 *  - If 404 or other non-200, set databank.logo_url = NULL so the directory
 *    falls back to an initials avatar rather than rendering a broken image.
 *
 * Run: pnpm tsx scripts/migrate-logos-retry.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const BUCKET = "logos";
const PREFIX = "databank";

type Failure = { id: string; startup_name: string; logo_url: string };

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

async function main() {
  const raw = await readFile(resolve(process.cwd(), "scripts/migrate-logos.failed.json"), "utf8");
  const failures: Failure[] = JSON.parse(raw);
  console.log(`Retrying ${failures.length} failures…`);

  let recovered = 0;
  let nullified = 0;
  let stillFail = 0;

  for (const f of failures) {
    try {
      const res = await fetch(f.logo_url, {
        headers: { "User-Agent": "PSEC-Logo-Retry/1.0", Accept: "image/*" },
        signal: AbortSignal.timeout(15000),
      });
      const ct = (res.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
      if (!res.ok || !ct.startsWith("image/")) {
        // Permanently broken upstream — null the column.
        const { error } = await supabase.from("databank").update({ logo_url: null }).eq("id", f.id);
        if (error) {
          console.log(`  ! ${f.startup_name}: null update failed: ${error.message}`);
          stillFail++;
        } else {
          nullified++;
        }
        continue;
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 64 || ab.byteLength > 5 * 1024 * 1024) {
        const { error } = await supabase.from("databank").update({ logo_url: null }).eq("id", f.id);
        if (!error) nullified++;
        else stillFail++;
        continue;
      }
      const ext = extFromUrl(new URL(f.logo_url).pathname) ?? extFromContentType(ct);
      const key = `${PREFIX}/${f.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, Buffer.from(ab), { contentType: ct, cacheControl: "31536000", upsert: true });
      if (upErr) {
        stillFail++;
        continue;
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
      const { error: updErr } = await supabase
        .from("databank")
        .update({ logo_url: pub.publicUrl })
        .eq("id", f.id);
      if (updErr) {
        stillFail++;
        continue;
      }
      recovered++;
    } catch {
      // Network error — null it out so the UI doesn't render a broken img.
      const { error } = await supabase.from("databank").update({ logo_url: null }).eq("id", f.id);
      if (!error) nullified++;
      else stillFail++;
    }
  }

  console.log(`Done. recovered=${recovered} nullified=${nullified} stillFail=${stillFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
