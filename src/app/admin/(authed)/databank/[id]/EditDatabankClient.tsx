"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Loader2, X } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useConfirm } from "@/components/ui/useConfirm";
import { FileUpload } from "@/components/form/FileUpload";
import { YesNo, CheckboxGroup } from "@/components/ui/RadioCard";
import {
  BUSINESS_MODELS,
  HQ_CITIES,
  NIC_CENTERS,
  SECTORS,
  STAGES,
  FOUNDER_GENDERS,
  coerceOptionValue,
  coerceOptionValues,
  normalizeOptions,
  type OptionList,
} from "@/lib/options";
import {
  OptionListsProvider,
  useOptionList,
  useOptionRegistry,
  type OptionRegistry,
} from "@/components/form/OptionListsContext";
import { COUNTRIES } from "@/lib/constants/countries";
import { InputType, htmlInputType } from "@/lib/forms/form-enums";
import type { DynamicFieldDef } from "@/lib/forms/form-config";

// CKEditor touches `window`; load it client-only.
const TaglineEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-32 w-full rounded-lg border border-pasha-line bg-pasha-stone/30 animate-pulse" />
  ),
});

// All editable columns.
export type DatabankRow = {
  id: string;
  source: string | null;
  startup_name: string;
  company_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  website: string | null;
  founded_date: string | null;
  primary_industry: string | null;
  secondary_industries: string | null;
  business_types: string | null;
  product_stage: string | null;
  city: string | null;
  hq_country: string | null;
  nic_name: string | null;
  incubation_stage: string | null;
  cohort: string | null;
  joining_date: string | null;
  total_employees: number | null;
  female_employees: number | null;
  jobs_created: number | null;
  current_revenue: number | null;
  investment_raised: number | null;
  investment_commitment: string | null;
  investment_raised_from: string | null;
  number_of_customers: number | null;
  startup_idea: string | null;
  business_model: string | null;
  social_impact: string | null;
  sdgs: string | null;
  video_pitch: string | null;
  awards: string | null;
  certifications: string | null;
  pasha_verified: boolean | null;
  // §13 directory badge flags (migration 20260623_directory_badges). Real
  // columns, populated from the submission on approval — see
  // api/admin/submission — and read by the public directory.
  women_led: boolean | null;
  hiring: boolean | null;
  fundraising: boolean | null;
  contact_person: string | null;
  contact_email: string | null;
  outreach_status: string | null;
  outreach_notes: string | null;
  company_linkedin: string | null;
  company_x: string | null;
  company_instagram: string | null;
  company_facebook: string | null;
  company_youtube: string | null;
  key_persons: KeyPerson[] | null;
  // Dynamic admin-defined form fields (cover_image, etc.) live here.
  answers: Record<string, unknown> | null;
  // Plus any other databank column — the row is loaded with select("*"), so
  // promoted/badge columns (fundraising, women_led, …) arrive without needing
  // to be enumerated here. Read/written dynamically via fieldStore.
  [key: string]: unknown;
};

type KeyPerson = {
  name?: string;
  role?: string;
  email?: string;
  mobile?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
  facebook?: string;
  custom_links?: { label?: string; url?: string }[];
  photo_url?: string;
  gender?: string;
  is_primary?: boolean;
};

// "" / number sentinel for input wiring.
type Edits = Partial<DatabankRow>;

// Publishing a submission copies its `answers` bag onto the databank row almost
// verbatim (see api/admin/submission), so a dynamic field's value lives in
// `answers` under its exact field_key — no per-field wiring needed. The only
// exception is the handful of fields promoted to real, RENAMED columns at
// publish time; those aren't in the answers bag, so they need this map.
const PROMOTED_COLUMN: Record<string, string> = {
  primary_sector: "primary_industry",
  secondary_sector: "secondary_industries",
  business_model: "business_types",
  stage: "product_stage",
  description: "startup_idea",
  hq_city: "city",
  year_founded: "founded_date",
  founder_name: "contact_person",
  founder_email: "contact_email",
  founders: "key_persons",
  currently_raising: "fundraising",
};

type FieldStore = { kind: "answers" } | { kind: "column"; col: string };

// Where a dynamic field's value actually lives — answers bag first (the dynamic
// default), then a promoted/renamed column, then a same-named column. Operates
// on the row as a plain bag: databank columns come from select("*") at runtime,
// so nothing here has to be spelled out in a type.
function fieldStore(def: DynamicFieldDef, row: DatabankRow): FieldStore {
  const bag = row as Record<string, unknown>;
  const answers = (row.answers ?? {}) as Record<string, unknown>;
  // The form is dynamic: answers is keyed by field_key and holds the value.
  if (def.field_key in answers) return { kind: "answers" };
  const promoted = PROMOTED_COLUMN[def.field_key];
  if (promoted && promoted in bag) return { kind: "column", col: promoted };
  if (def.field_key in bag) return { kind: "column", col: def.field_key };
  // Never captured on this row — default new values into the answers bag.
  return { kind: "answers" };
}

function asNumber(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// A legacy column "has data" when it isn't null/undefined/blank.
//
// These gates are always fed the ORIGINAL loaded record, never the live edited
// state. Reading the live row meant clearing a value — removing a logo, or
// emptying a text input — made its own field disappear mid-edit, with no way
// to put anything back. Which columns are on screen is decided once, by what
// the record held when it was opened.
function has(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

// Resolve a named list from the registry passed down by the server, falling
function pickList(
  registry: OptionRegistry | undefined,
  name: string,
  fallback: OptionList
): { value: string; label: string }[] {
  const fromDb = registry?.[name];
  return fromDb?.length ? fromDb : normalizeOptions(fallback);
}

export function EditDatabankClient({
  initial,
  dynamicFields = [],
  configColumns = [],
  optionLists,
}: {
  initial: DatabankRow;
  // Every editable application-form field, in form-builder order.
  dynamicFields?: DynamicFieldDef[];
  // Databank columns already covered by `dynamicFields`. The hand-written
  // column section below renders only what's NOT in here, so nothing appears
  // twice and imported-only columns stay editable.
  configColumns?: string[];
  // Resolved `option_lists` registry — the single source of truth for the
  optionLists?: OptionRegistry;
}) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [row, setRow] = useState<DatabankRow>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Single source of truth for the static column editors below.
  const cityOptions = pickList(optionLists, "HQ_CITIES", HQ_CITIES);
  const countryOptions = pickList(optionLists, "COUNTRIES", COUNTRIES);
  const sectorOptions = pickList(optionLists, "SECTORS", SECTORS);
  const businessModelOptions = pickList(optionLists, "BUSINESS_MODELS", BUSINESS_MODELS);
  const nicCenterOptions = pickList(optionLists, "NIC_CENTERS", NIC_CENTERS);
  const stageOptions = pickList(optionLists, "STAGES", STAGES);

  // What changed from initial?
  const diff = useMemo(() => {
    const out: Edits = {};
    for (const k of Object.keys(row) as (keyof DatabankRow)[]) {
      const a = row[k];
      const b = initial[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        (out as Record<string, unknown>)[k] = a;
      }
    }
    return out;
  }, [row, initial]);

  const hasChanges = Object.keys(diff).length > 0;

  // DEBUG — logs the raw databank row, the answers bag, and how each dynamic
  // field resolves (store + raw value). Remove once field mapping is verified.
  useMemo(() => {
    if (typeof window === "undefined") return null;
    console.group("[databank-edit] API data");
    console.log("row (columns):", initial);
    console.log("answers bag:", initial.answers);
    console.log("optionLists keys:", Object.keys(optionLists ?? {}));
    const table = dynamicFields.map((f) => {
      const store = fieldStore(f, initial);
      const raw =
        store.kind === "column"
          ? (initial as Record<string, unknown>)[store.col]
          : (initial.answers ?? {})[f.field_key];
      return {
        field_key: f.field_key,
        label: f.label,
        store: store.kind === "column" ? `col:${store.col}` : "answers",
        options_source: f.options_source ?? "",
        raw_value: raw,
        empty: raw === null || raw === undefined || raw === "",
      };
    });
    console.table(table);
    console.groupEnd();
    return null;
    // Log once per loaded record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function update<K extends keyof DatabankRow>(key: K, value: DatabankRow[K]) {
    setRow((r) => ({ ...r, [key]: value }));
  }

  // Patch a single dynamic (answers-bag) field, merging into the JSONB column.
  function setAnswer(key: string, value: unknown) {
    setRow((r) => ({ ...r, answers: { ...(r.answers ?? {}), [key]: value } }));
  }

  // Set an arbitrary databank column (dynamic — not every column is in the
  // hand-written editors, so this can't require keyof).
  function setColumn(col: string, value: unknown) {
    setRow((r) => ({ ...r, [col]: value }));
  }

  // Read/write a config field against wherever its value actually lives —
  // resolved once from the ORIGINAL row so a value cleared mid-edit doesn't
  // relocate the field to a different store.
  const readField = (def: DynamicFieldDef): unknown => {
    const store = fieldStore(def, initial);
    return store.kind === "column"
      ? (row as Record<string, unknown>)[store.col]
      : (row.answers ?? {})[def.field_key];
  };
  const writeField = (def: DynamicFieldDef, v: unknown) => {
    const store = fieldStore(def, initial);
    if (store.kind === "column") setColumn(store.col, v);
    else setAnswer(def.field_key, v);
  };

  // A hand-written column field renders only when the form config doesn't
  // already cover that column (otherwise it would appear twice, in two
  // different orders) AND the record actually holds a value for it.
  // Resolved the same way the inputs read, so a renamed column (primary_sector
  // → primary_industry) is correctly recognised as already covered and doesn't
  // also render in the hand-written block below.
  const covered = useMemo(() => {
    const s = new Set<string>(configColumns);
    for (const f of dynamicFields) {
      const store = fieldStore(f, initial);
      if (store.kind === "column") s.add(store.col);
    }
    return s;
  }, [configColumns, dynamicFields, initial]);
  // Whether the form config places the founders group itself; if not, the
  // standalone Key persons section below stands in for it.
  const hasFoundersField = dynamicFields.some((f) => f.input_type === InputType.GROUP);
  const legacy = (key: keyof DatabankRow) =>
    !covered.has(key as string) && has(initial[key]);
  const anyLegacy = (...keys: (keyof DatabankRow)[]) => keys.some(legacy);
  // The whole hand-written block; each field still gates itself via `legacy`.
  const showStaticFields = true;

  // Same step → section hierarchy the applicant sees, just stacked onto one
  // page instead of paginated. Insertion order is the config order, which
  // collectAllEditableFields already sorts by step and section sort_order.
  const groupedDynamic = useMemo(() => {
    const steps = new Map<
      number,
      { title: string; sections: Map<string, { subtitle: string | null; fields: DynamicFieldDef[] }> }
    >();
    for (const f of dynamicFields) {
      let step = steps.get(f.step);
      if (!step) {
        step = { title: f.step_title, sections: new Map() };
        steps.set(f.step, step);
      }
      let section = step.sections.get(f.section);
      if (!section) {
        section = { subtitle: f.section_subtitle, fields: [] };
        step.sections.set(f.section, section);
      }
      section.fields.push(f);
    }
    return [...steps.entries()].map(([step, s]) => ({
      step,
      title: s.title,
      sections: [...s.sections.entries()].map(([title, v]) => ({
        title,
        subtitle: v.subtitle,
        fields: v.fields,
      })),
    }));
  }, [dynamicFields]);

  async function save() {
    if (!hasChanges) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await api.patch(ENDPOINTS.admin.databank, { id: row.id, updates: diff });
      setSuccess("Saved.");
      // Reflect the saved state as the new baseline so the diff resets.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete “${row.startup_name}”?`,
      description: "This can’t be undone.",
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(ENDPOINTS.admin.databank, { id: row.id });
      router.push("/admin/databank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  // Year derived from founded_date for the editor; on save we re-emit a {year}-01-01 date so the column stays a DATE.
  const yearFromFounded = (() => {
    if (!row.founded_date) return "";
    const m = String(row.founded_date).match(/^(\d{4})/);
    return m ? m[1] : "";
  })();

  return (
    <OptionListsProvider value={optionLists ?? {}}>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/databank"
          className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md border border-pasha-line bg-white px-3 py-1.5 text-xs font-medium text-pasha-red hover:bg-pasha-red/[0.04] disabled:opacity-50 transition-colors"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1.5 rounded-md bg-pasha-red px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-pasha-red-dark disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving…" : hasChanges ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      <header className="rounded-2xl border border-pasha-line bg-white p-5 flex items-start gap-5">
        <div className="shrink-0 w-20 h-20 rounded-2xl border border-pasha-line bg-pasha-stone/40 grid place-items-center overflow-hidden">
          {row.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.logo_url}
              alt=""
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <span className="text-xs text-pasha-muted">No logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink truncate">
            {row.startup_name}
          </h1>
          <p className="text-xs text-pasha-muted mt-1 font-mono">
            id: {row.id} · source: {row.source ?? "—"}
          </p>
          <Link
            href={`/directory/${slugForRow(row)}`}
            target="_blank"
            className="mt-2 inline-flex items-center gap-1 text-xs text-pasha-red hover:underline"
          >
            View public profile →
          </Link>
        </div>
      </header>

      {(error || success) && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (error
              ? "border-pasha-red/30 bg-pasha-red/[0.04] text-pasha-red"
              : "border-tier-featured/30 bg-tier-featured/[0.06] text-tier-featured")
          }
        >
          {error ?? success}
        </div>
      )}

      {showStaticFields && (
        <>
      {/* Always rendered: unlike the legacy columns below, the logo is core to
          every directory listing, and gating it on `has()` meant a startup that
          never uploaded one could never be given one from here. */}
      <Section title="Branding & identity">
        <Field label="Logo" hint="PNG / JPG / SVG. Square works best.">
          <FileUpload
            bucket="logos"
            value={row.logo_url ?? undefined}
            onChange={(url) => update("logo_url", url ?? null)}
            accept={{
              "image/*": [
                ".png",
                ".jpg",
                ".jpeg",
                ".jfif",
                ".jfi",
                ".pjpeg",
                ".pjp",
                ".webp",
                ".svg",
                ".gif",
                ".avif",
              ],
            }}
            maxSizeMB={5}
            label="Drop logo or click to upload"
            hint="Square aspect ratio works best."
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("startup_name") && (
          <Field label="Startup name">
            <Input
              value={row.startup_name ?? ""}
              onChange={(e) => update("startup_name", e.target.value)}
            />
          </Field>
          )}
          {legacy("company_name") && (
          <Field label="Legal / company name">
            <Input
              value={row.company_name ?? ""}
              onChange={(e) => update("company_name", e.target.value || null)}
            />
          </Field>
          )}
        </div>
        {legacy("tagline") && (
        <Field label="Tagline" hint="Rich text — shown publicly under the name.">
          <TaglineEditor
            value={row.tagline ?? ""}
            onChange={(html) => update("tagline", html || null)}
          />
        </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("website") && (
          <Field label="Website">
            <Input
              type="url"
              value={row.website ?? ""}
              onChange={(e) => update("website", e.target.value || null)}
              placeholder="https://"
            />
          </Field>
          )}
          {legacy("founded_date") && (
          <Field label="Year founded" hint="4-digit year.">
            <Input
              type="number"
              min={1900}
              max={2099}
              value={yearFromFounded}
              onChange={(e) => {
                const v = e.target.value;
                update("founded_date", v ? `${v}-01-01` : null);
              }}
              placeholder="2022"
            />
          </Field>
          )}
        </div>
        {legacy("pasha_verified") && (
        <Field
          label="PASHA verified"
          hint="Flip on to publish the badge + tooltip on the public profile."
        >
          <YesNo
            value={!!row.pasha_verified}
            onChange={(v) => update("pasha_verified", v)}
          />
        </Field>
        )}
      </Section>

      {anyLegacy("city", "hq_country", "primary_industry", "secondary_industries", "business_types", "product_stage") && (
      <Section title="Location & category">
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("city") && (
          <Field label="HQ city (or 'Other' for write-in)">
            <SelectMenu
              className="w-full"
              value={coerceOptionValue(row.city ?? "", cityOptions)}
              onValueChange={(v) => update("city", v || null)}
              placeholder="Select city"
              options={cityOptions}
            />
          </Field>
          )}
          {legacy("hq_country") && (
          <Field label="Country (if outside Pakistan)">
            <SelectMenu
              className="w-full"
              value={coerceOptionValue(row.hq_country ?? "", countryOptions)}
              onValueChange={(v) => update("hq_country", v || null)}
              placeholder="Select country"
              options={countryOptions}
            />
          </Field>
          )}
          {legacy("primary_industry") && (
          <Field label="Primary industry">
            <SelectMenu
              className="w-full"
              value={coerceOptionValue(row.primary_industry ?? "", sectorOptions)}
              onValueChange={(v) => update("primary_industry", v || null)}
              placeholder="Select primary industry"
              options={sectorOptions}
            />
          </Field>
          )}
          {legacy("secondary_industries") && (
          <Field label="Secondary industries">
            <Input
              value={row.secondary_industries ?? ""}
              onChange={(e) =>
                update("secondary_industries", e.target.value || null)
              }
              placeholder="Free text"
            />
          </Field>
          )}
          {legacy("business_types") && (
          <Field label="Business model / type">
            <SelectMenu
              className="w-full"
              value={row.business_types ?? ""}
              onValueChange={(v) => update("business_types", v || null)}
              placeholder="Select business model"
              options={businessModelOptions}
            />
          </Field>
          )}
          {legacy("product_stage") && (
          <Field label="Product stage">
            <SelectMenu
              className="w-full"
              value={coerceOptionValue(row.product_stage ?? "", stageOptions)}
              onValueChange={(v) => update("product_stage", v || null)}
              placeholder="Select product stage"
              options={stageOptions}
            />
          </Field>
          )}
        </div>
      </Section>
      )}

      {anyLegacy("nic_name", "incubation_stage", "cohort", "joining_date") && (
      <Section title="Incubation">
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("nic_name") && (
          <Field label="NIC / incubation center">
            <SelectMenu
              className="w-full"
              value={row.nic_name ?? ""}
              onValueChange={(v) => update("nic_name", v || null)}
              placeholder="Select center"
              options={nicCenterOptions}
            />
          </Field>
          )}
          {legacy("incubation_stage") && (
          <Field label="Stage of incubation">
            <Input
              value={row.incubation_stage ?? ""}
              onChange={(e) =>
                update("incubation_stage", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("cohort") && (
          <Field label="Cohort">
            <Input
              value={row.cohort ?? ""}
              onChange={(e) => update("cohort", e.target.value || null)}
            />
          </Field>
          )}
          {legacy("joining_date") && (
          <Field label="Joining date" hint="YYYY-MM-DD">
            <Input
              type="date"
              value={(row.joining_date ?? "").slice(0, 10)}
              onChange={(e) => update("joining_date", e.target.value || null)}
            />
          </Field>
          )}
        </div>
      </Section>
      )}

      {anyLegacy("total_employees", "female_employees", "jobs_created", "number_of_customers", "current_revenue", "investment_raised", "investment_commitment", "investment_raised_from") && (
      <Section title="Team & traction">
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("total_employees") && (
          <Field label="Total employees">
            <Input
              type="number"
              min={0}
              value={row.total_employees ?? ""}
              onChange={(e) => update("total_employees", asNumber(e.target.value))}
            />
          </Field>
          )}
          {legacy("female_employees") && (
          <Field label="Female employees">
            <Input
              type="number"
              min={0}
              value={row.female_employees ?? ""}
              onChange={(e) =>
                update("female_employees", asNumber(e.target.value))
              }
            />
          </Field>
          )}
          {legacy("jobs_created") && (
          <Field label="Jobs created">
            <Input
              type="number"
              min={0}
              value={row.jobs_created ?? ""}
              onChange={(e) => update("jobs_created", asNumber(e.target.value))}
            />
          </Field>
          )}
          {legacy("number_of_customers") && (
          <Field label="Customers">
            <Input
              type="number"
              min={0}
              value={row.number_of_customers ?? ""}
              onChange={(e) =>
                update("number_of_customers", asNumber(e.target.value))
              }
            />
          </Field>
          )}
          {legacy("current_revenue") && (
          <Field label="Annual revenue (PKR)">
            <Input
              type="number"
              min={0}
              step={1}
              value={row.current_revenue ?? ""}
              onChange={(e) =>
                update("current_revenue", asNumber(e.target.value))
              }
            />
          </Field>
          )}
          {legacy("investment_raised") && (
          <Field label="Investment raised (PKR, lifetime)">
            <Input
              type="number"
              min={0}
              step={1}
              value={row.investment_raised ?? ""}
              onChange={(e) =>
                update("investment_raised", asNumber(e.target.value))
              }
            />
          </Field>
          )}
          {legacy("investment_commitment") && (
          <Field label="Investment commitments (PKR)">
            <Input
              value={row.investment_commitment ?? ""}
              onChange={(e) =>
                update("investment_commitment", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("investment_raised_from") && (
          <Field label="Source of capital">
            <Input
              value={row.investment_raised_from ?? ""}
              onChange={(e) =>
                update("investment_raised_from", e.target.value || null)
              }
              placeholder="VC, Angel, Bootstrapped…"
            />
          </Field>
          )}
        </div>
      </Section>
      )}

      {anyLegacy("startup_idea", "business_model", "social_impact", "sdgs", "video_pitch") && (
      <Section title="About" subtitle="Long-form text shown on the public profile. HTML is sanitised on render.">
        {legacy("startup_idea") && (
        <Field label="Tagline / startup idea (paragraph)">
          <Textarea
            value={stripTags(row.startup_idea ?? "")}
            onChange={(e) => update("startup_idea", e.target.value || null)}
            rows={5}
          />
        </Field>
        )}
        {legacy("business_model") && (
        <Field label="Business model (paragraph)">
          <Textarea
            value={stripTags(row.business_model ?? "")}
            onChange={(e) => update("business_model", e.target.value || null)}
            rows={4}
          />
        </Field>
        )}
        {legacy("social_impact") && (
        <Field label="Social impact">
          <Textarea
            value={row.social_impact ?? ""}
            onChange={(e) => update("social_impact", e.target.value || null)}
            rows={3}
          />
        </Field>
        )}
        {legacy("sdgs") && (
        <Field label="SDGs" hint="Pipe / semicolon / comma separated.">
          <Input
            value={row.sdgs ?? ""}
            onChange={(e) => update("sdgs", e.target.value || null)}
          />
        </Field>
        )}
        {legacy("video_pitch") && (
        <Field label="Pitch video URL">
          <Input
            type="url"
            value={row.video_pitch ?? ""}
            onChange={(e) => update("video_pitch", e.target.value || null)}
            placeholder="https://youtu.be/..."
          />
        </Field>
        )}
      </Section>
      )}

      {legacy("certifications") && (
      <Section title="Recognition">
        {/* Awards are managed in Admin → Award Winners (not here). */}
        <Field label="Certifications" hint="ISO, SOC 2, PCI-DSS, etc.">
          <Textarea
            value={row.certifications ?? ""}
            onChange={(e) => update("certifications", e.target.value || null)}
            rows={3}
          />
        </Field>
      </Section>
      )}

      {anyLegacy("contact_person", "contact_email", "outreach_status", "outreach_notes") && (
      <Section title="Contact (private)" subtitle="Not shown on the public profile. Used by the secretariat for outreach.">
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("contact_person") && (
          <Field label="Primary contact">
            <Input
              value={row.contact_person ?? ""}
              onChange={(e) =>
                update("contact_person", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("contact_email") && (
          <Field label="Primary contact email">
            <Input
              type="email"
              value={row.contact_email ?? ""}
              onChange={(e) => update("contact_email", e.target.value || null)}
            />
          </Field>
          )}
          {legacy("outreach_status") && (
          <Field label="Outreach status">
            <SelectMenu
              className="w-full"
              value={row.outreach_status ?? ""}
              onValueChange={(v) => update("outreach_status", v || null)}
              placeholder="—"
              options={[
                { value: "not_contacted", label: "Not contacted" },
                { value: "invited", label: "Invited" },
                { value: "responded", label: "Responded" },
                { value: "submitted", label: "Submitted" },
                { value: "declined", label: "Declined" },
              ]}
            />
          </Field>
          )}
        </div>
        {legacy("outreach_notes") && (
        <Field label="Outreach notes">
          <Textarea
            value={row.outreach_notes ?? ""}
            onChange={(e) => update("outreach_notes", e.target.value || null)}
            rows={3}
          />
        </Field>
        )}
      </Section>
      )}

      {anyLegacy("company_linkedin", "company_x", "company_instagram", "company_facebook", "company_youtube") && (
      <Section title="Company socials">
        <div className="grid sm:grid-cols-2 gap-5">
          {legacy("company_linkedin") && (
          <Field label="LinkedIn">
            <Input
              type="url"
              value={row.company_linkedin ?? ""}
              onChange={(e) =>
                update("company_linkedin", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("company_x") && (
          <Field label="X / Twitter">
            <Input
              type="url"
              value={row.company_x ?? ""}
              onChange={(e) => update("company_x", e.target.value || null)}
            />
          </Field>
          )}
          {legacy("company_instagram") && (
          <Field label="Instagram">
            <Input
              type="url"
              value={row.company_instagram ?? ""}
              onChange={(e) =>
                update("company_instagram", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("company_facebook") && (
          <Field label="Facebook">
            <Input
              type="url"
              value={row.company_facebook ?? ""}
              onChange={(e) =>
                update("company_facebook", e.target.value || null)
              }
            />
          </Field>
          )}
          {legacy("company_youtube") && (
          <Field label="YouTube">
            <Input
              type="url"
              value={row.company_youtube ?? ""}
              onChange={(e) =>
                update("company_youtube", e.target.value || null)
              }
            />
          </Field>
          )}
        </div>
      </Section>
      )}
        </>
      )}

      {groupedDynamic.length > 0 ? (
        <Section
          title="Application form fields"
          subtitle="Every field from the application form, in the same order applicants see it — all steps on one page."
        >
          <div className="space-y-10">
            {groupedDynamic.map((stepGroup) => (
              <div key={stepGroup.step} className="space-y-6">
                {/* Step heading — mirrors the wizard's step title. */}
                <div className="flex items-center gap-3 border-b border-pasha-line pb-3">
                  <span className="font-mono text-[10px] text-pasha-muted tabular-nums">
                    {String(stepGroup.step).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold text-pasha-ink">{stepGroup.title}</h3>
                </div>

                {stepGroup.sections.map((section, sIdx) => (
                  <div key={section.title} className="space-y-5">
                    {/* The first section of a step shares the step's own title,
                        so only later ones get their own heading — same rule the
                        wizard uses. */}
                    {sIdx > 0 && (
                      <div>
                        <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
                          {section.title}
                        </h4>
                        {section.subtitle && (
                          <p className="mt-1 text-xs text-pasha-muted/80">{section.subtitle}</p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
                      {section.fields.map((def, i) =>
                        // Composites keep their place in the sequence but need
                        // their own editors — founders write to key_persons,
                        // the city composite to the HQ columns.
                        // Only the founders group is the people editor. Every
                        // other group (awards, etc.) is a generic repeatable
                        // subsection defined in the form builder.
                        def.input_type === InputType.GROUP ? (
                          <div key={def.field_key} className="lg:col-span-6">
                            <p className="mb-1 text-sm font-medium text-pasha-ink">{def.label}</p>
                            {def.hint && (
                              <p className="mb-3 text-xs text-pasha-muted">{def.hint}</p>
                            )}
                            {def.field_key === "founders" ? (
                              <KeyPersonsEditor
                                persons={row.key_persons ?? []}
                                onChange={(next) => update("key_persons", next)}
                              />
                            ) : (
                              <RepeatableGroupEditor
                                def={def}
                                value={readField(def)}
                                onChange={(v) => writeField(def, v)}
                              />
                            )}
                          </div>
                        ) : def.input_type === InputType.CITY_COMPOSITE ? (
                          <div key={def.field_key} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-6">
                            <Field label="HQ city">
                              <SelectMenu
                                className="w-full"
                                value={coerceOptionValue(row.city, cityOptions) ?? ""}
                                onValueChange={(v) => update("city", v || null)}
                                options={cityOptions}
                                placeholder="Select city"
                              />
                            </Field>
                            <Field label="HQ country">
                              <SelectMenu
                                className="w-full"
                                value={coerceOptionValue(row.hq_country, countryOptions) ?? ""}
                                onValueChange={(v) => update("hq_country", v || null)}
                                options={countryOptions}
                                placeholder="Select country"
                              />
                            </Field>
                          </div>
                        ) : (
                        <Field
                          key={def.field_key}
                          label={def.label}
                          hint={def.hint ?? undefined}
                          className={fieldSpan(def, i, section.fields)}
                        >
                      {/* A field either maps to a real databank column or
                          lives in the answers bag — read and write whichever
                          it is, so column-backed fields are editable here too
                          instead of only appearing in the legacy block. */}
                          <DynamicFieldControl
                            def={def}
                            value={readField(def)}
                            onChange={(v) => writeField(def, v)}
                          />
                        </Field>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section
          title="Application form fields"
          subtitle="No admin-defined dynamic fields are configured for the application form yet."
        >
          <p className="text-sm text-pasha-muted">
            Add fields in the form builder (Forms) and they will appear here for
            editing.
          </p>
        </Section>
      )}

      {/* Key persons and the HQ city/country pair are rendered inline above, at
          the position the application form puts them. Only shown here as a
          fallback when the form config defines no founders group at all. */}
      {!hasFoundersField && (
        <Section
          title="Key persons"
          subtitle="The founders / leadership shown publicly. Add, edit, remove, reorder."
        >
          <KeyPersonsEditor
            persons={row.key_persons ?? []}
            onChange={(next) => update("key_persons", next)}
          />
        </Section>
      )}

      <div className="pt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-md border border-pasha-line bg-white px-3 py-1.5 text-xs font-medium text-pasha-red hover:bg-pasha-red/[0.04] disabled:opacity-50 transition-colors"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-1.5 rounded-md bg-pasha-red px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-pasha-red-dark disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saving ? "Saving…" : hasChanges ? "Save changes" : "Saved"}
        </button>
      </div>

      {confirmDialog}
    </div>
    </OptionListsProvider>
  );
}

// ---------- subcomponents ----------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-pasha-line bg-white p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-pasha-muted">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// --------------------------------------------------------------------------- DynamicFieldControl — editable control for an admin-defined.
function DynamicFieldControl({
  def,
  value,
  onChange,
}: {
  def: DynamicFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const t = def.input_type;
  // Stored answers are admin-managed option IDs (UUIDs). `def.options` only
  // resolves against the CODE constants, so a UUID matched nothing and the
  // control rendered blank — resolve against the live registry first.
  const registry = useOptionRegistry();
  const fromRegistry = def.options_source ? registry[def.options_source] : undefined;
  const options = fromRegistry?.length ? fromRegistry : def.options;

  if (t === InputType.YES_NO) {
    return (
      <YesNo
        value={typeof value === "boolean" ? value : undefined}
        onChange={(v) => onChange(v)}
      />
    );
  }

  if (t === InputType.MULTISELECT) {
    return (
      <CheckboxGroup
        value={coerceOptionValues(value, options)}
        onChange={(next) => onChange(next)}
        options={options}
      />
    );
  }

  if (t === InputType.SELECT || t === InputType.RADIO_CARDS) {
    return (
      <SelectMenu
        className="w-full"
        // Coerce so a legacy value (or an id) both resolve to a live option.
        value={coerceOptionValue(value, options) ?? (typeof value === "string" ? value : "")}
        onValueChange={(v) => onChange(v || null)}
        placeholder={def.placeholder ?? "Select"}
        options={options}
      />
    );
  }

  if (t === InputType.FILE_UPLOAD) {
    return (
      <FileUpload
        bucket={def.bucket ?? "logos"}
        value={typeof value === "string" && value ? value : undefined}
        onChange={(url) => onChange(url ?? null)}
        accept={
          def.accept ?? {
            "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"],
          }
        }
        maxSizeMB={def.maxSizeMB ?? 5}
        label="Drop file or click to upload"
      />
    );
  }

  if (t === InputType.TEXTAREA) {
    return (
      <Textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
        rows={6}
        placeholder={def.placeholder ?? undefined}
      />
    );
  }

  if (t === InputType.RICH_TEXT) {
    return (
      <TaglineEditor
        value={typeof value === "string" ? value : ""}
        onChange={(html: string) => onChange(html || null)}
      />
    );
  }

  // Scalar inputs: text / email / url / phone / number / date.
  return (
    <Input
      type={htmlInputType(t)}
      value={value == null ? "" : String(value)}
      placeholder={def.placeholder ?? undefined}
      onChange={(e) => {
        const raw = e.target.value;
        if (t === InputType.NUMBER) {
          onChange(raw === "" ? null : Number(raw));
        } else {
          onChange(raw || null);
        }
      }}
    />
  );
}

// Generic editor for an admin-defined repeatable subsection (awards, and
// anything else added as a repeatable group in the form builder). Rows are
// plain objects keyed by the group's child field_keys, stored as an array.
function RepeatableGroupEditor({
  def,
  value,
  onChange,
}: {
  def: DynamicFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const children = def.children ?? [];
  const rows: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[]).filter(
        (r) => r && typeof r === "object" && !Array.isArray(r)
      )
    : [];
  const itemLabel = def.item_label || "item";
  const max = def.max_items ?? Infinity;

  if (children.length === 0) {
    return (
      <p className="text-xs text-pasha-muted">
        This group has no child fields configured in the form builder.
      </p>
    );
  }

  const patch = (idx: number, key: string, v: unknown) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [key]: v } : r));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((r, idx) => (
        <div key={idx} className="rounded-xl border border-pasha-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-pasha-muted">
              {itemLabel} #{idx + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              className="inline-flex items-center gap-1 text-xs text-pasha-muted hover:text-pasha-red"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {children.map((child) => (
              <Field
                key={child.field_key}
                label={child.label}
                hint={child.hint ?? undefined}
                className={
                  child.input_type === InputType.TEXTAREA ||
                  child.input_type === InputType.RICH_TEXT
                    ? "sm:col-span-2"
                    : undefined
                }
              >
                <DynamicFieldControl
                  def={child}
                  value={r[child.field_key]}
                  onChange={(v) => patch(idx, child.field_key, v)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}

      {rows.length < max && (
        <button
          type="button"
          onClick={() => onChange([...rows, {}])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink transition-colors hover:border-pasha-red hover:text-pasha-red"
        >
          <Plus className="h-4 w-4" />
          Add {itemLabel}
        </button>
      )}
    </div>
  );
}

// Inline editor for the key_persons JSONB column. Mirrors the public form's
function KeyPersonsEditor({
  persons,
  onChange,
}: {
  persons: KeyPerson[];
  onChange: (next: KeyPerson[]) => void;
}) {
  // Reads the registry supplied by EditDatabankClient's OptionListsProvider.
  const genderOptions = useOptionList("FOUNDER_GENDERS", FOUNDER_GENDERS);

  function patch(i: number, change: Partial<KeyPerson>) {
    const next = [...persons];
    next[i] = { ...next[i], ...change };
    // Re-stamp primary uniqueness if the user just toggled is_primary on.
    if (change.is_primary === true) {
      for (let j = 0; j < next.length; j++) {
        if (j !== i) next[j] = { ...next[j], is_primary: false };
      }
    }
    onChange(next);
  }
  function remove(i: number) {
    const next = persons.filter((_, j) => j !== i);
    if (next.length > 0 && !next.some((p) => p.is_primary)) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }
  function add() {
    onChange([
      ...persons,
      {
        name: "",
        role: "",
        email: "",
        mobile: "",
        linkedin: "",
        x: "",
        instagram: "",
        facebook: "",
        custom_links: [],
        photo_url: "",
        gender: "",
        is_primary: persons.length === 0,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {persons.length === 0 && (
        <p className="text-sm text-pasha-muted">No key persons yet.</p>
      )}
      {persons.map((p, idx) => (
        <div key={idx} className="rounded-xl border border-pasha-line bg-pasha-stone/30 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
              Person #{idx + 1} {p.is_primary ? "· Primary" : ""}
            </span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="inline-flex items-center gap-1 text-xs text-pasha-muted hover:text-pasha-red transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          <Field label="Photo" hint="Square is best. JPG / PNG.">
            <FileUpload
              bucket="founder-photos"
              value={p.photo_url || undefined}
              onChange={(url) => patch(idx, { photo_url: url ?? "" })}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [] }}
              maxSizeMB={5}
              label="Upload photo"
              hint="Optional — square photo (JPG/PNG) up to 5MB."
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name">
              <Input
                value={p.name ?? ""}
                onChange={(e) => patch(idx, { name: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Input
                value={p.role ?? ""}
                onChange={(e) => patch(idx, { role: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={p.email ?? ""}
                onChange={(e) => patch(idx, { email: e.target.value })}
              />
            </Field>
            <Field label="Mobile">
              <Input
                type="tel"
                value={p.mobile ?? ""}
                onChange={(e) => patch(idx, { mobile: e.target.value })}
              />
            </Field>
            <Field label="Gender">
              <SelectMenu
                className="w-full"
                // Founders store the legacy value ("male"), but the options
                // table keys on UUIDs — coerce so the saved value matches an
                // option and the select isn't blank.
                value={coerceOptionValue(p.gender, genderOptions) ?? ""}
                onValueChange={(v) => patch(idx, { gender: v })}
                placeholder="Select gender"
                options={genderOptions}
              />
            </Field>
            <Field label="Primary contact">
              <YesNo
                value={!!p.is_primary}
                onChange={(v) => patch(idx, { is_primary: v })}
              />
            </Field>
          </div>

          <div className="border-t border-pasha-line/60 pt-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted mb-3">
              Social links
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="LinkedIn">
                <Input
                  type="url"
                  value={p.linkedin ?? ""}
                  onChange={(e) => patch(idx, { linkedin: e.target.value })}
                />
              </Field>
              <Field label="X / Twitter">
                <Input
                  type="url"
                  value={p.x ?? ""}
                  onChange={(e) => patch(idx, { x: e.target.value })}
                />
              </Field>
              <Field label="Instagram">
                <Input
                  type="url"
                  value={p.instagram ?? ""}
                  onChange={(e) => patch(idx, { instagram: e.target.value })}
                />
              </Field>
              <Field label="Facebook">
                <Input
                  type="url"
                  value={p.facebook ?? ""}
                  onChange={(e) => patch(idx, { facebook: e.target.value })}
                />
              </Field>
            </div>
            <CustomLinksEditor
              links={p.custom_links ?? []}
              onChange={(next) => patch(idx, { custom_links: next })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add person
      </button>
    </div>
  );
}

function CustomLinksEditor({
  links,
  onChange,
}: {
  links: { label?: string; url?: string }[];
  onChange: (next: { label?: string; url?: string }[]) => void;
}) {
  function patch(i: number, change: Partial<{ label?: string; url?: string }>) {
    const next = [...links];
    next[i] = { ...next[i], ...change };
    onChange(next);
  }
  function remove(i: number) {
    onChange(links.filter((_, j) => j !== i));
  }

  return (
    <div className="mt-3">
      <div className="text-xs text-pasha-muted mb-2">
        Custom links — GitHub, personal site, Substack, anything else
      </div>
      {links.length > 0 && (
        <div className="space-y-2 mb-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Label"
                className="max-w-[180px]"
                value={l.label ?? ""}
                onChange={(e) => patch(i, { label: e.target.value })}
              />
              <Input
                type="url"
                placeholder="https://"
                value={l.url ?? ""}
                onChange={(e) => patch(i, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove link"
                className="shrink-0 rounded-md p-1.5 text-pasha-muted hover:text-pasha-red hover:bg-pasha-red/[0.04] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...links, { label: "", url: "" }])}
        className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted hover:text-pasha-red transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add link
      </button>
    </div>
  );
}

// ---------- helpers ----------

// Column span for a field inside the responsive grid.
function fieldSpan(
  def: DynamicFieldDef,
  i: number,
  defs: DynamicFieldDef[]
): string {
  const t = def.input_type;
  const full = "md:col-span-2 lg:col-span-6";

  // Base span per field category: short choices (dropdown / yes-no) → 3 per row
  // (2 of 6); checkbox grids → 2 per row (3 of 6); short text → 2 per row;
  // long text → the full row; file run → 2 per row.
  let span: string;
  if (t === InputType.MULTISELECT) {
    // Tall checkbox grids need room for two option columns.
    span = "lg:col-span-3";
  } else if (isChoiceField(t)) {
    span = "lg:col-span-2";
  } else if (t === InputType.TEXTAREA || t === InputType.RICH_TEXT) {
    // Long-form content always gets the whole row — half a row left these
    // scrolling inside a cramped box with the other half empty.
    span = full;
  } else if (
    t === InputType.TEXT ||
    t === InputType.EMAIL ||
    t === InputType.URL ||
    t === InputType.PHONE ||
    t === InputType.NUMBER ||
    t === InputType.DATE
  ) {
    span = "lg:col-span-3";
  } else if (t === InputType.FILE_UPLOAD) {
    const inRun =
      defs[i - 1]?.input_type === InputType.FILE_UPLOAD ||
      defs[i + 1]?.input_type === InputType.FILE_UPLOAD;
    span = inRun ? "lg:col-span-3" : full;
  } else {
    span = full; // radio cards, group, etc.
  }

  // Start a new row whenever this field's category differs from the field before it — fields only share a row with same-category neighbours.
  const startNew =
    i === 0 || fieldCategory(t) !== fieldCategory(defs[i - 1].input_type);

  return span + (startNew ? " lg:col-start-1" : "");
}

// Short, single-line choice controls. Multiselect is deliberately NOT here:
// its checkbox grid is several rows tall, so sharing a row with a dropdown left
// a large gap under the dropdown.
function isChoiceField(t: number | undefined): boolean {
  return t === InputType.YES_NO || t === InputType.SELECT;
}

// Coarse layout category — fields only share a grid row with neighbours of
function fieldCategory(t: number): string {
  // Multiselect gets its own category so a tall checkbox grid never shares a
  // row with a short dropdown.
  if (t === InputType.MULTISELECT) return "multi";
  if (isChoiceField(t)) return "choice";
  if (t === InputType.TEXTAREA || t === InputType.RICH_TEXT) return "longtext";
  if (t === InputType.FILE_UPLOAD) return "file";
  if (
    t === InputType.TEXT ||
    t === InputType.EMAIL ||
    t === InputType.URL ||
    t === InputType.PHONE ||
    t === InputType.NUMBER ||
    t === InputType.DATE
  ) {
    return "text";
  }
  return "other";
}

// Strip HTML tags from incoming text so the textarea shows plain text.
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
}

function slugForRow(r: DatabankRow): string {
  const head = r.startup_name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const tail = r.id.replace(/-/g, "").slice(0, 8).toLowerCase();
  return `${head}-${tail}`;
}
