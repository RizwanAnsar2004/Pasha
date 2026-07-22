import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, CheckCircle2, FileText, Paperclip } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { getDatabankDynamicFields } from "@/lib/forms/form-config.server";
import { getAwardTitlesForDatabank } from "@/lib/startups/awards/awards.server";
import { InputType } from "@/lib/forms/form-enums";
import { sanitizeHtml } from "@/lib/validators/sanitize-html";
import { formatNumber, formatCurrency } from "@/lib/utils";
import type { DynamicFieldDef } from "@/lib/forms/form-config";
import { getOptionIndex } from "@/lib/options/index.server";
import { optionLabelOf, resolveOptionLabel, type OptionIndex } from "@/lib/options/resolve";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function load(id: string): Promise<Row | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("databank").select("*").eq("id", id).maybeSingle();
  return (data ?? null) as Row | null;
}

function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0)
  );
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function slugForRow(r: Row): string {
  const head = str(r.startup_name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const tail = str(r.id).replace(/-/g, "").slice(0, 8).toLowerCase();
  return `${head}-${tail}`;
}

// ── presentational ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-pasha-line bg-white p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-pasha-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ReadField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">{label}</div>
      <div className="mt-1 text-sm text-pasha-ink whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}

// Render a static column value, returning null when empty (so the field hides).
function colNode(row: Row, key: string, kind: "text" | "number" | "currency" | "bool" | "html" | "url" = "text") {
  const v = row[key];
  // A null/undefined value hides the field entirely — for booleans too.
  if (kind === "bool") {
    if (v === null || v === undefined) return null;
    return v ? "Yes" : "No";
  }
  if (isEmpty(v)) return null;
  switch (kind) {
    case "number":
      return typeof v === "number" ? formatNumber(v) : str(v);
    case "currency":
      return typeof v === "number" ? formatCurrency(v) : str(v);
    case "url":
      return (
        <a
          href={str(v).startsWith("http") ? str(v) : `https://${str(v)}`}
          target="_blank"
          rel="noreferrer"
          className="text-pasha-red hover:underline break-all"
        >
          {str(v)}
        </a>
      );
    case "html":
      return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(str(v)) }} />;
    default:
      return str(v);
  }
}

// Render a dynamic answers-bag value by its input type — only the SELECTED value(s), never the unselected options/checkboxes.
// The human filename out of a storage URL, minus the upload timestamp prefix.
function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const last = path.split("/").filter(Boolean).pop() ?? "";
    // Uploads are stored as "<timestamp>-<original name>".
    const stripped = last.replace(/^\d{10,}-/, "");
    return stripped || fallback;
  } catch {
    return fallback;
  }
}

// A document link shown as an icon + filename rather than a raw storage URL.
function FileChip({ url, fallbackLabel }: { url: string; fallbackLabel: string }) {
  if (!url) return null;
  const name = fileNameFromUrl(url, fallbackLabel);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  const Icon = isPdf ? FileText : Paperclip;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={name}
      className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink transition-colors hover:border-pasha-red hover:text-pasha-red"
    >
      <Icon className={`h-4 w-4 shrink-0 ${isPdf ? "text-pasha-red" : "text-pasha-muted"}`} aria-hidden />
      <span className="truncate">{name}</span>
      {isPdf && (
        <span className="shrink-0 rounded bg-pasha-red/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-pasha-red">
          PDF
        </span>
      )}
    </a>
  );
}

function dynamicNode(def: DynamicFieldDef, value: unknown, index: OptionIndex): React.ReactNode | null {
  if (isEmpty(value) && def.input_type !== InputType.YES_NO) return null;
  const t = def.input_type;

  if (t === InputType.YES_NO) {
    if (typeof value !== "boolean") return null;
    return value ? "Yes" : "No";
  }
  if (t === InputType.SELECT || t === InputType.RADIO_CARDS) {
    const opt = def.options.find((o) => o.value === value);
    return opt?.label ?? optionLabelOf(index, value) ?? str(value);
  }
  if (t === InputType.MULTISELECT) {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const labels = arr.map(
      (v) => def.options.find((o) => o.value === v)?.label ?? optionLabelOf(index, v) ?? v
    );
    return labels.length ? labels.join(", ") : null;
  }
  if (t === InputType.FILE_UPLOAD) {
    const url = str(value);
    const isImg = /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url);
    if (isImg) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={def.label} className="mt-1 max-h-40 rounded-lg border border-pasha-line" />
      );
    }
    return <FileChip url={url} fallbackLabel={def.label} />;
  }
  if (t === InputType.RICH_TEXT) {
    return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(str(value)) }} />;
  }
  if (t === InputType.URL) {
    return (
      <a
        href={str(value).startsWith("http") ? str(value) : `https://${str(value)}`}
        target="_blank"
        rel="noreferrer"
        className="text-pasha-red hover:underline break-all"
      >
        {str(value)}
      </a>
    );
  }
  return str(value);
}

// Columns that store an options/countries id and must be resolved to a label.
const CHOICE_COLUMNS: [string, string][] = [
  ["city", "HQ_CITIES"],
  ["hq_country", "COUNTRIES"],
  ["primary_industry", "SECTORS"],
  ["product_stage", "STAGES"],
  ["nic_name", "NIC_CENTERS"],
];

// business_types is a delimited multi-select, so each part resolves separately.
const MULTI_CHOICE_COLUMNS = ["business_types"];

// Static field groups mirroring the edit page layout.
const STATIC_GROUPS: { title: string; fields: [string, string, ("text" | "number" | "currency" | "bool" | "html" | "url")?][] }[] = [
  {
    title: "Branding & identity",
    fields: [
      ["company_name", "Legal / company name"],
      ["tagline", "Tagline", "html"],
      ["website", "Website", "url"],
      ["founded_date", "Founded"],
      ["pasha_verified", "PASHA verified", "bool"],
    ],
  },
  {
    title: "Location & category",
    fields: [
      ["city", "HQ city"],
      ["hq_country", "Country"],
      ["primary_industry", "Primary industry"],
      ["secondary_industries", "Secondary industries"],
      ["business_types", "Business model / type"],
      ["product_stage", "Product stage"],
    ],
  },
  {
    title: "Incubation",
    fields: [
      ["nic_name", "NIC / incubation center"],
      ["incubation_stage", "Stage of incubation"],
      ["cohort", "Cohort"],
      ["joining_date", "Joining date"],
    ],
  },
  {
    title: "Team & traction",
    fields: [
      ["total_employees", "Total employees", "number"],
      ["female_employees", "Female employees", "number"],
      ["jobs_created", "Jobs created", "number"],
      ["number_of_customers", "Customers", "number"],
      ["current_revenue", "Current revenue", "currency"],
      ["investment_raised", "Investment raised", "currency"],
      ["investment_commitment", "Investment commitment"],
      ["investment_raised_from", "Investment raised from"],
    ],
  },
  {
    title: "Story",
    fields: [
      ["startup_idea", "Startup idea", "html"],
      ["business_model", "Business model", "html"],
      ["social_impact", "Social impact", "html"],
      ["sdgs", "SDGs"],
      ["awards", "Awards"],
      ["certifications", "Certifications"],
      ["video_pitch", "Video pitch", "url"],
    ],
  },
  {
    title: "Contact & outreach",
    fields: [
      ["contact_person", "Contact person"],
      ["contact_email", "Contact email"],
      ["outreach_status", "Outreach status"],
      ["outreach_notes", "Outreach notes"],
    ],
  },
  {
    title: "Social profiles",
    fields: [
      ["company_linkedin", "LinkedIn", "url"],
      ["company_x", "X (Twitter)", "url"],
      ["company_instagram", "Instagram", "url"],
      ["company_facebook", "Facebook", "url"],
      ["company_youtube", "YouTube", "url"],
    ],
  },
];

export default async function ViewDatabankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, dynamicFields] = await Promise.all([load(id), getDatabankDynamicFields()]);
  if (!row) notFound();

  // Awards are curated in Admin → Award Winners (startup_awards).
  const curatedAwards = await getAwardTitlesForDatabank(id);
  if (curatedAwards.length > 0) row.awards = curatedAwards.join("\n");

  // Choice columns may hold an option id — swap in the label before any field renders.
  const optionIndex = await getOptionIndex();
  for (const [key, type] of CHOICE_COLUMNS) {
    row[key] = resolveOptionLabel(optionIndex, type, typeof row[key] === "string" ? (row[key] as string) : null);
  }
  for (const key of MULTI_CHOICE_COLUMNS) {
    const raw = typeof row[key] === "string" ? (row[key] as string) : "";
    if (!raw) continue;
    row[key] = raw
      .split(/[|;,]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => optionLabelOf(optionIndex, part) ?? part)
      .join(" · ");
  }

  const answers = (row.answers ?? {}) as Row;
  const keyPersons = Array.isArray(row.key_persons) ? (row.key_persons as Row[]) : [];

  // Dynamic fields grouped by their form section, only those with a value.
  const groupedDynamic = new Map<string, { def: DynamicFieldDef; node: React.ReactNode }[]>();
  for (const def of dynamicFields) {
    const node = dynamicNode(def, answers[def.field_key], optionIndex);
    if (node === null) continue;
    const arr = groupedDynamic.get(def.section) ?? [];
    arr.push({ def, node });
    groupedDynamic.set(def.section, arr);
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/databank" className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Link
          href={`/admin/databank/${id}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-pasha-red px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      {/* Header card */}
      <header className="rounded-2xl border border-pasha-line bg-white p-5 flex items-start gap-5">
        <div className="shrink-0 w-20 h-20 rounded-2xl border border-pasha-line bg-pasha-stone/40 grid place-items-center overflow-hidden">
          {row.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={str(row.logo_url)} alt="" className="w-full h-full object-contain p-2" />
          ) : (
            <span className="text-xs text-pasha-muted">No logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl tracking-tight text-pasha-ink truncate">
              {str(row.startup_name) || "Unnamed startup"}
            </h1>
            {row.pasha_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            ) : null}
          </div>
          <p className="text-xs text-pasha-muted mt-1 font-mono">id: {str(row.id)} · source: {str(row.source) || "—"}</p>
          <Link href={`/directory/${slugForRow(row)}`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs text-pasha-red hover:underline">
            View public profile →
          </Link>
          <p className="mt-2 text-[11px] text-pasha-muted">Read-only preview — nothing here can be edited.</p>
        </div>
      </header>

      {/* Static sections — only render a section if it has at least one value */}
      {STATIC_GROUPS.map((group) => {
        const rendered = group.fields
          .map(([key, label, kind]) => ({ key, label, node: colNode(row, key, kind ?? "text") }))
          .filter((f) => f.node !== null);
        if (rendered.length === 0) return null;
        return (
          <Section key={group.title} title={group.title}>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {rendered.map((f) => {
                const wide = f.label === "Tagline" || ["Startup idea", "Business model", "Social impact", "Outreach notes"].includes(f.label);
                return (
                  <ReadField key={f.key} label={f.label} full={wide}>
                    {f.node}
                  </ReadField>
                );
              })}
            </div>
          </Section>
        );
      })}

      {/* Dynamic application-form fields */}
      {[...groupedDynamic.entries()].length > 0 && (
        <Section title="Application form fields" subtitle="Admin-defined fields from the dynamic form.">
          <div className="space-y-6">
            {[...groupedDynamic.entries()].map(([sectionTitle, items]) => (
              <div key={sectionTitle} className="space-y-5">
                <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted border-t border-pasha-line/60 pt-4 first:border-t-0 first:pt-0">
                  {sectionTitle}
                </h4>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                  {items.map(({ def, node }) => {
                    const wide = def.input_type === InputType.RICH_TEXT || def.input_type === InputType.TEXTAREA || def.input_type === InputType.FILE_UPLOAD;
                    return (
                      <ReadField key={def.field_key} label={def.label} full={wide}>
                        {node}
                      </ReadField>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key persons */}
      {keyPersons.length > 0 && (
        <Section title="Key persons" subtitle="Founders / leadership shown publicly.">
          <ul className="grid sm:grid-cols-2 gap-4">
            {keyPersons.map((p, i) => (
              <li key={i} className="rounded-xl border border-pasha-line/70 p-4 flex items-start gap-3">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={str(p.photo_url)} alt="" className="w-12 h-12 rounded-full object-cover border border-pasha-line shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-pasha-stone/60 border border-pasha-line grid place-items-center text-xs text-pasha-muted shrink-0">
                    {str(p.name).slice(0, 1) || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pasha-ink">{str(p.name) || "—"}</p>
                  {!isEmpty(p.role) && <p className="text-xs text-pasha-red/80">{str(p.role)}</p>}
                  {!isEmpty(p.email) && <p className="text-xs text-pasha-muted break-all">{str(p.email)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
