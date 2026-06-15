"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Loader2, X } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileUpload } from "@/components/form/FileUpload";
import { YesNo } from "@/components/ui/RadioCard";
import {
  BUSINESS_MODELS,
  HQ_CITIES,
  NIC_CENTERS,
  SECTORS,
  FOUNDER_GENDERS,
} from "@/lib/options";
import { COUNTRIES } from "@/lib/countries";

// All editable columns. Matches the EDITABLE_COLUMNS set in
// /api/admin/databank/route.ts — the API will silently drop anything else
// out of paranoia.
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

// "" / number sentinel for input wiring. We convert to null for the PATCH.
type Edits = Partial<DatabankRow>;

function asNumber(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function EditDatabankClient({ initial }: { initial: DatabankRow }) {
  const router = useRouter();
  const [row, setRow] = useState<DatabankRow>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // What changed from initial? PATCH only diffed keys to avoid clobbering
  // columns we didn't touch on the form.
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

  async function save() {
    if (!hasChanges) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/databank", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id, updates: diff }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
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
    if (
      !confirm(
        `Delete "${row.startup_name}"? This permanently removes the row from the public directory. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/databank", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Delete failed");
      router.push("/admin/databank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  // Year derived from founded_date for the editor; on save we re-emit a
  // {year}-01-01 date so the column stays a DATE.
  const yearFromFounded = (() => {
    if (!row.founded_date) return "";
    const m = String(row.founded_date).match(/^(\d{4})/);
    return m ? m[1] : "";
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/databank"
          className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to data bank
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

      <Section title="Branding & identity">
        <Field label="Logo" hint="PNG / JPG / SVG. Square works best.">
          <FileUpload
            bucket="logos"
            value={row.logo_url ?? undefined}
            onChange={(url) => update("logo_url", url ?? null)}
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] }}
            maxSizeMB={5}
            label="Drop logo or click to upload"
            hint="Square aspect ratio works best."
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Startup name">
            <Input
              value={row.startup_name ?? ""}
              onChange={(e) => update("startup_name", e.target.value)}
            />
          </Field>
          <Field label="Legal / company name">
            <Input
              value={row.company_name ?? ""}
              onChange={(e) => update("company_name", e.target.value || null)}
            />
          </Field>
        </div>
        <Field label="Tagline" hint="One sentence — shown publicly under the name.">
          <Input
            value={row.tagline ?? ""}
            onChange={(e) => update("tagline", e.target.value || null)}
            placeholder="e.g. Faster healthcare for everyone in Pakistan"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Website">
            <Input
              type="url"
              value={row.website ?? ""}
              onChange={(e) => update("website", e.target.value || null)}
              placeholder="https://"
            />
          </Field>
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
        </div>
        <Field
          label="P@SHA verified"
          hint="Flip on to publish the badge + tooltip on the public profile."
        >
          <YesNo
            value={!!row.pasha_verified}
            onChange={(v) => update("pasha_verified", v)}
          />
        </Field>
      </Section>

      <Section title="Location & category">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="HQ city (or 'Other' for write-in)">
            <Select
              value={row.city ?? ""}
              onChange={(e) => update("city", e.target.value || null)}
              placeholder="Select city"
              options={[...HQ_CITIES]}
            />
          </Field>
          <Field label="Country (if outside Pakistan)">
            <Select
              value={row.hq_country ?? ""}
              onChange={(e) => update("hq_country", e.target.value || null)}
              placeholder="Select country"
              options={[...COUNTRIES]}
            />
          </Field>
          <Field label="Primary industry">
            <Select
              value={row.primary_industry ?? ""}
              onChange={(e) => update("primary_industry", e.target.value || null)}
              placeholder="Select primary industry"
              options={[...SECTORS]}
            />
          </Field>
          <Field label="Secondary industries">
            <Input
              value={row.secondary_industries ?? ""}
              onChange={(e) =>
                update("secondary_industries", e.target.value || null)
              }
              placeholder="Free text"
            />
          </Field>
          <Field label="Business model / type">
            <Select
              value={row.business_types ?? ""}
              onChange={(e) => update("business_types", e.target.value || null)}
              placeholder="Select business model"
              options={[...BUSINESS_MODELS]}
            />
          </Field>
          <Field label="Product stage">
            <Input
              value={row.product_stage ?? ""}
              onChange={(e) => update("product_stage", e.target.value || null)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Incubation">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="NIC / incubation center">
            <Select
              value={row.nic_name ?? ""}
              onChange={(e) => update("nic_name", e.target.value || null)}
              placeholder="Select center"
              options={[...NIC_CENTERS]}
            />
          </Field>
          <Field label="Stage of incubation">
            <Input
              value={row.incubation_stage ?? ""}
              onChange={(e) =>
                update("incubation_stage", e.target.value || null)
              }
            />
          </Field>
          <Field label="Cohort">
            <Input
              value={row.cohort ?? ""}
              onChange={(e) => update("cohort", e.target.value || null)}
            />
          </Field>
          <Field label="Joining date" hint="YYYY-MM-DD">
            <Input
              type="date"
              value={(row.joining_date ?? "").slice(0, 10)}
              onChange={(e) => update("joining_date", e.target.value || null)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Team & traction">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Total employees">
            <Input
              type="number"
              min={0}
              value={row.total_employees ?? ""}
              onChange={(e) => update("total_employees", asNumber(e.target.value))}
            />
          </Field>
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
          <Field label="Jobs created">
            <Input
              type="number"
              min={0}
              value={row.jobs_created ?? ""}
              onChange={(e) => update("jobs_created", asNumber(e.target.value))}
            />
          </Field>
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
          <Field label="Investment commitments (PKR)">
            <Input
              value={row.investment_commitment ?? ""}
              onChange={(e) =>
                update("investment_commitment", e.target.value || null)
              }
            />
          </Field>
          <Field label="Source of capital">
            <Input
              value={row.investment_raised_from ?? ""}
              onChange={(e) =>
                update("investment_raised_from", e.target.value || null)
              }
              placeholder="VC, Angel, Bootstrapped…"
            />
          </Field>
        </div>
      </Section>

      <Section title="About" subtitle="Long-form text shown on the public profile. HTML is sanitised on render.">
        <Field label="Tagline / startup idea (paragraph)">
          <Textarea
            value={stripTags(row.startup_idea ?? "")}
            onChange={(e) => update("startup_idea", e.target.value || null)}
            rows={5}
          />
        </Field>
        <Field label="Business model (paragraph)">
          <Textarea
            value={stripTags(row.business_model ?? "")}
            onChange={(e) => update("business_model", e.target.value || null)}
            rows={4}
          />
        </Field>
        <Field label="Social impact">
          <Textarea
            value={row.social_impact ?? ""}
            onChange={(e) => update("social_impact", e.target.value || null)}
            rows={3}
          />
        </Field>
        <Field label="SDGs" hint="Pipe / semicolon / comma separated.">
          <Input
            value={row.sdgs ?? ""}
            onChange={(e) => update("sdgs", e.target.value || null)}
          />
        </Field>
        <Field label="Pitch video URL">
          <Input
            type="url"
            value={row.video_pitch ?? ""}
            onChange={(e) => update("video_pitch", e.target.value || null)}
            placeholder="https://youtu.be/..."
          />
        </Field>
      </Section>

      <Section title="Recognition">
        <Field label="Awards & recognition" hint="One per line.">
          <Textarea
            value={row.awards ?? ""}
            onChange={(e) => update("awards", e.target.value || null)}
            rows={4}
          />
        </Field>
        <Field label="Certifications" hint="ISO, SOC 2, PCI-DSS, etc.">
          <Textarea
            value={row.certifications ?? ""}
            onChange={(e) => update("certifications", e.target.value || null)}
            rows={3}
          />
        </Field>
      </Section>

      <Section title="Contact (private)" subtitle="Not shown on the public profile. Used by the secretariat for outreach.">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Primary contact">
            <Input
              value={row.contact_person ?? ""}
              onChange={(e) =>
                update("contact_person", e.target.value || null)
              }
            />
          </Field>
          <Field label="Primary contact email">
            <Input
              type="email"
              value={row.contact_email ?? ""}
              onChange={(e) => update("contact_email", e.target.value || null)}
            />
          </Field>
          <Field label="Outreach status">
            <Select
              value={row.outreach_status ?? ""}
              onChange={(e) => update("outreach_status", e.target.value || null)}
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
        </div>
        <Field label="Outreach notes">
          <Textarea
            value={row.outreach_notes ?? ""}
            onChange={(e) => update("outreach_notes", e.target.value || null)}
            rows={3}
          />
        </Field>
      </Section>

      <Section title="Company socials">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="LinkedIn">
            <Input
              type="url"
              value={row.company_linkedin ?? ""}
              onChange={(e) =>
                update("company_linkedin", e.target.value || null)
              }
            />
          </Field>
          <Field label="X / Twitter">
            <Input
              type="url"
              value={row.company_x ?? ""}
              onChange={(e) => update("company_x", e.target.value || null)}
            />
          </Field>
          <Field label="Instagram">
            <Input
              type="url"
              value={row.company_instagram ?? ""}
              onChange={(e) =>
                update("company_instagram", e.target.value || null)
              }
            />
          </Field>
          <Field label="Facebook">
            <Input
              type="url"
              value={row.company_facebook ?? ""}
              onChange={(e) =>
                update("company_facebook", e.target.value || null)
              }
            />
          </Field>
          <Field label="YouTube">
            <Input
              type="url"
              value={row.company_youtube ?? ""}
              onChange={(e) =>
                update("company_youtube", e.target.value || null)
              }
            />
          </Field>
        </div>
      </Section>

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
    </div>
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

/**
 * Inline editor for the key_persons JSONB column. Mirrors the public form's
 * FoundersRepeater but operates on a plain controlled value (no react-hook-
 * form context).
 */
function KeyPersonsEditor({
  persons,
  onChange,
}: {
  persons: KeyPerson[];
  onChange: (next: KeyPerson[]) => void;
}) {
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
              <Select
                value={p.gender ?? ""}
                onChange={(e) => patch(idx, { gender: e.target.value })}
                placeholder="Select gender"
                options={[...FOUNDER_GENDERS]}
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

/** Strip HTML tags from incoming text so the textarea shows plain text.
 * On save, the user's plain-text edit replaces the column wholesale —
 * the public detail page sanitises before render anyway. */
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
