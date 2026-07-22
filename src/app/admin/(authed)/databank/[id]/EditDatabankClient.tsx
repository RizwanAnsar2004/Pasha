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

function asNumber(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// A legacy column "has data" when it isn't null/undefined/blank.
function has(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

// Render a section's children only when at least one of the given column values has data — so a fully-empty legacy section disappears entirely.
function anyHas(...vals: unknown[]): boolean {
  return vals.some(has);
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
  // This page now renders ONLY the admin-defined dynamic form fields.
  showStaticFields = false,
  optionLists,
}: {
  initial: DatabankRow;
  dynamicFields?: DynamicFieldDef[];
  showStaticFields?: boolean;
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

  function update<K extends keyof DatabankRow>(key: K, value: DatabankRow[K]) {
    setRow((r) => ({ ...r, [key]: value }));
  }

  // Patch a single dynamic (answers-bag) field, merging into the JSONB column.
  function setAnswer(key: string, value: unknown) {
    setRow((r) => ({ ...r, answers: { ...(r.answers ?? {}), [key]: value } }));
  }

  // Dynamic fields grouped by their form section, preserving config order.
  const groupedDynamic = useMemo(() => {
    const m = new Map<string, DynamicFieldDef[]>();
    for (const f of dynamicFields) {
      const arr = m.get(f.section) ?? [];
      arr.push(f);
      m.set(f.section, arr);
    }
    return [...m.entries()];
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
      {anyHas(row.logo_url, row.startup_name, row.company_name, row.tagline, row.website, row.founded_date, row.pasha_verified) && (
      <Section title="Branding & identity">
        {has(row.logo_url) && (
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
        )}
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.startup_name) && (
          <Field label="Startup name">
            <Input
              value={row.startup_name ?? ""}
              onChange={(e) => update("startup_name", e.target.value)}
            />
          </Field>
          )}
          {has(row.company_name) && (
          <Field label="Legal / company name">
            <Input
              value={row.company_name ?? ""}
              onChange={(e) => update("company_name", e.target.value || null)}
            />
          </Field>
          )}
        </div>
        {has(row.tagline) && (
        <Field label="Tagline" hint="Rich text — shown publicly under the name.">
          <TaglineEditor
            value={row.tagline ?? ""}
            onChange={(html) => update("tagline", html || null)}
          />
        </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.website) && (
          <Field label="Website">
            <Input
              type="url"
              value={row.website ?? ""}
              onChange={(e) => update("website", e.target.value || null)}
              placeholder="https://"
            />
          </Field>
          )}
          {has(row.founded_date) && (
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
        {has(row.pasha_verified) && (
        <Field
          label="P@SHA verified"
          hint="Flip on to publish the badge + tooltip on the public profile."
        >
          <YesNo
            value={!!row.pasha_verified}
            onChange={(v) => update("pasha_verified", v)}
          />
        </Field>
        )}
      </Section>
      )}

      {anyHas(row.city, row.hq_country, row.primary_industry, row.secondary_industries, row.business_types, row.product_stage) && (
      <Section title="Location & category">
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.city) && (
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
          {has(row.hq_country) && (
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
          {has(row.primary_industry) && (
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
          {has(row.secondary_industries) && (
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
          {has(row.business_types) && (
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
          {has(row.product_stage) && (
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

      {anyHas(row.nic_name, row.incubation_stage, row.cohort, row.joining_date) && (
      <Section title="Incubation">
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.nic_name) && (
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
          {has(row.incubation_stage) && (
          <Field label="Stage of incubation">
            <Input
              value={row.incubation_stage ?? ""}
              onChange={(e) =>
                update("incubation_stage", e.target.value || null)
              }
            />
          </Field>
          )}
          {has(row.cohort) && (
          <Field label="Cohort">
            <Input
              value={row.cohort ?? ""}
              onChange={(e) => update("cohort", e.target.value || null)}
            />
          </Field>
          )}
          {has(row.joining_date) && (
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

      {anyHas(row.total_employees, row.female_employees, row.jobs_created, row.number_of_customers, row.current_revenue, row.investment_raised, row.investment_commitment, row.investment_raised_from) && (
      <Section title="Team & traction">
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.total_employees) && (
          <Field label="Total employees">
            <Input
              type="number"
              min={0}
              value={row.total_employees ?? ""}
              onChange={(e) => update("total_employees", asNumber(e.target.value))}
            />
          </Field>
          )}
          {has(row.female_employees) && (
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
          {has(row.jobs_created) && (
          <Field label="Jobs created">
            <Input
              type="number"
              min={0}
              value={row.jobs_created ?? ""}
              onChange={(e) => update("jobs_created", asNumber(e.target.value))}
            />
          </Field>
          )}
          {has(row.number_of_customers) && (
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
          {has(row.current_revenue) && (
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
          {has(row.investment_raised) && (
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
          {has(row.investment_commitment) && (
          <Field label="Investment commitments (PKR)">
            <Input
              value={row.investment_commitment ?? ""}
              onChange={(e) =>
                update("investment_commitment", e.target.value || null)
              }
            />
          </Field>
          )}
          {has(row.investment_raised_from) && (
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

      {anyHas(row.startup_idea, row.business_model, row.social_impact, row.sdgs, row.video_pitch) && (
      <Section title="About" subtitle="Long-form text shown on the public profile. HTML is sanitised on render.">
        {has(row.startup_idea) && (
        <Field label="Tagline / startup idea (paragraph)">
          <Textarea
            value={stripTags(row.startup_idea ?? "")}
            onChange={(e) => update("startup_idea", e.target.value || null)}
            rows={5}
          />
        </Field>
        )}
        {has(row.business_model) && (
        <Field label="Business model (paragraph)">
          <Textarea
            value={stripTags(row.business_model ?? "")}
            onChange={(e) => update("business_model", e.target.value || null)}
            rows={4}
          />
        </Field>
        )}
        {has(row.social_impact) && (
        <Field label="Social impact">
          <Textarea
            value={row.social_impact ?? ""}
            onChange={(e) => update("social_impact", e.target.value || null)}
            rows={3}
          />
        </Field>
        )}
        {has(row.sdgs) && (
        <Field label="SDGs" hint="Pipe / semicolon / comma separated.">
          <Input
            value={row.sdgs ?? ""}
            onChange={(e) => update("sdgs", e.target.value || null)}
          />
        </Field>
        )}
        {has(row.video_pitch) && (
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

      {has(row.certifications) && (
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

      {anyHas(row.contact_person, row.contact_email, row.outreach_status, row.outreach_notes) && (
      <Section title="Contact (private)" subtitle="Not shown on the public profile. Used by the secretariat for outreach.">
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.contact_person) && (
          <Field label="Primary contact">
            <Input
              value={row.contact_person ?? ""}
              onChange={(e) =>
                update("contact_person", e.target.value || null)
              }
            />
          </Field>
          )}
          {has(row.contact_email) && (
          <Field label="Primary contact email">
            <Input
              type="email"
              value={row.contact_email ?? ""}
              onChange={(e) => update("contact_email", e.target.value || null)}
            />
          </Field>
          )}
          {has(row.outreach_status) && (
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
        {has(row.outreach_notes) && (
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

      {anyHas(row.company_linkedin, row.company_x, row.company_instagram, row.company_facebook, row.company_youtube) && (
      <Section title="Company socials">
        <div className="grid sm:grid-cols-2 gap-5">
          {has(row.company_linkedin) && (
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
          {has(row.company_x) && (
          <Field label="X / Twitter">
            <Input
              type="url"
              value={row.company_x ?? ""}
              onChange={(e) => update("company_x", e.target.value || null)}
            />
          </Field>
          )}
          {has(row.company_instagram) && (
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
          {has(row.company_facebook) && (
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
          {has(row.company_youtube) && (
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
          subtitle="Admin-defined fields from the dynamic form (e.g. cover image). Saved to this listing."
        >
          <div className="space-y-6">
            {groupedDynamic.map(([sectionTitle, defs]) => (
              <div key={sectionTitle} className="space-y-5">
                <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted border-t border-pasha-line/60 pt-4 first:border-t-0 first:pt-0">
                  {sectionTitle}
                </h4>
                {/* Two columns above md, three above lg; wide controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
                  {defs.map((def, i) => (
                    <Field
                      key={def.field_key}
                      label={def.label}
                      hint={def.hint ?? undefined}
                      className={fieldSpan(def, i, defs)}
                    >
                      <DynamicFieldControl
                        def={def}
                        value={(row.answers ?? {})[def.field_key]}
                        onChange={(v) => setAnswer(def.field_key, v)}
                      />
                    </Field>
                  ))}
                </div>
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

      {/* Founders / key persons live in the key_persons column for both legacy */}
      <Section
        title="Key persons"
        subtitle="The founders / leadership shown publicly. Add, edit, remove, reorder."
      >
        <KeyPersonsEditor
          persons={row.key_persons ?? []}
          onChange={(next) => update("key_persons", next)}
        />
      </Section>

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
        value={coerceOptionValues(value, def.options)}
        onChange={(next) => onChange(next)}
        options={def.options}
      />
    );
  }

  if (t === InputType.SELECT || t === InputType.RADIO_CARDS) {
    return (
      <SelectMenu
        className="w-full"
        value={typeof value === "string" ? value : ""}
        onValueChange={(v) => onChange(v || null)}
        placeholder={def.placeholder ?? "Select"}
        options={def.options}
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
        rows={4}
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
                value={p.gender ?? ""}
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

  // Base span per field category: choice (checkboxes / yes-no / dropdown) → 3 per row (2 of 6) text / long text → 2 per row (3 of 6) file run → 2 per.
  let span: string;
  if (isChoiceField(t)) {
    span = "lg:col-span-2";
  } else if (
    t === InputType.TEXTAREA ||
    t === InputType.RICH_TEXT ||
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

// Checkbox group, yes/no, and single-select dropdown — compact choice
function isChoiceField(t: number | undefined): boolean {
  return (
    t === InputType.MULTISELECT ||
    t === InputType.YES_NO ||
    t === InputType.SELECT
  );
}

// Coarse layout category — fields only share a grid row with neighbours of
function fieldCategory(t: number): string {
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
