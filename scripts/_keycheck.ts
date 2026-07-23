import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
loadEnv({ path: resolve(process.cwd(), ".env.local") });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const { data: fields } = await sb.from("form_fields").select("field_key,label,input_type,column_map,parent_field_id").order("sort_order");
  const top = (fields ?? []).filter((f) => !f.parent_field_id);
  console.log("form_fields (top-level):", top.length);

  const { data: rows } = await sb.from("databank").select("*").eq("source", "submission").limit(3);
  const row = (rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) { console.log("no submission-sourced row"); return; }
  const ans = (row.answers ?? {}) as Record<string, unknown>;
  const cols = new Set(Object.keys(row));
  console.log("\nRow:", row.startup_name, "| answers keys:", Object.keys(ans).length);

  console.log("\nfield_key".padEnd(32) + "dbCol   ans   value");
  console.log("-".repeat(88));
  const missing: string[] = [];
  for (const f of top) {
    const k = f.field_key as string;
    const inCol = cols.has(k);
    const inAns = k in ans;
    if (!inCol && !inAns) missing.push(`${k} (col_map=${f.column_map ?? "-"}) — ${f.label}`);
    const v = inAns ? ans[k] : row[k];
    console.log(k.padEnd(32) + `${inCol ? "Y" : "-"}       ${inAns ? "Y" : "-"}     ${JSON.stringify(v ?? null).slice(0, 30)}`);
  }
  console.log("\n--- resolves to NOTHING on the databank row ---");
  console.log(missing.join("\n") || "(none)");
  console.log("\n--- answers keys actually present ---");
  console.log(Object.keys(ans).sort().join(", ") || "(EMPTY)");
}
main().catch((e) => { console.error(e); process.exit(1); });
