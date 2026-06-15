"use client";

import type { StepProps } from "../ApplyForm";
import { Field } from "../Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CheckboxGroup, YesNo } from "@/components/ui/RadioCard";
import { FileUpload } from "../FileUpload";
import { CityField } from "../controls/CityField";
import {
  BUSINESS_MODELS,
  FOUNDING_TEAM_COMPOSITIONS,
  FUNDING_STAGES,
  NIC_CENTERS,
  REVENUE_BANDS,
  REVENUE_MODELS,
  SECTORS,
  STAGES,
} from "@/lib/options";

/**
 * Step 1 — Startup
 *
 * Consolidates every company-level field from the legacy 7-step wizard into
 * one long but well-sectioned page. Each sub-heading is separated by a thin
 * divider; the rhythm matches the public detail page's sidebar groups so
 * the form feels visually consistent with the directory.
 *
 * Required fields here: startup_name, website, year_founded, description,
 * hq_city (or hq_country if outside_pakistan), primary_sector, stage.
 */
export function Step1Startup({ form }: StepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const v = watch();

  return (
    <div className="space-y-10">
      {/* ---------- Basics ---------- */}
      <Section title="Basics">
        <Field
          label="Startup name"
          required
          error={errors.startup_name?.message}
        >
          <Input
            {...register("startup_name")}
            placeholder="Your startup's name"
            autoComplete="organization"
          />
        </Field>

        <Field label="Tagline" hint="One sentence. Shown publicly under the name.">
          <Input
            {...register("tagline")}
            placeholder="e.g. Faster healthcare for everyone in Pakistan"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Website" required error={errors.website?.message}>
            <Input
              type="url"
              {...register("website")}
              placeholder="https://yourstartup.com"
            />
          </Field>
          <Field
            label="Year founded"
            required
            hint="4-digit year, e.g. 2022"
            error={errors.year_founded?.message}
          >
            <Input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              placeholder="2022"
              {...register("year_founded")}
            />
          </Field>
        </div>

        <Field
          label="Brief description"
          hint="What does your startup do? At least 50 characters, max ~2000."
          required
          error={errors.description?.message}
        >
          <Textarea
            {...register("description")}
            rows={5}
            placeholder="We build an AI-powered platform that helps…"
          />
          <span className="text-[11px] text-pasha-muted font-mono">
            {(v.description ?? "").length} chars
          </span>
        </Field>

        <Field
          label="Startup logo"
          hint="Used in the public directory. PNG/JPG/SVG, square works best."
        >
          <FileUpload
            bucket="logos"
            value={v.logo_url}
            onChange={(url) =>
              setValue("logo_url", url || undefined, { shouldValidate: true })
            }
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] }}
            maxSizeMB={5}
            label="Drop logo or click to upload"
            hint="Square aspect ratio works best."
          />
        </Field>
      </Section>

      {/* ---------- Location ---------- */}
      <Section title="Location">
        <CityField />
      </Section>

      {/* ---------- Category ---------- */}
      <Section title="Category">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="Primary sector"
            required
            error={errors.primary_sector?.message}
          >
            <Select
              {...register("primary_sector")}
              placeholder="Select primary sector"
              options={[...SECTORS]}
            />
          </Field>
          <Field label="Secondary sector">
            <Input
              {...register("secondary_sector")}
              placeholder="e.g. CleanTech"
            />
          </Field>
          <Field label="Business model">
            <Select
              {...register("business_model")}
              placeholder="Select business model"
              options={[...BUSINESS_MODELS]}
            />
          </Field>
          <Field
            label="Current stage"
            required
            error={errors.stage?.message}
          >
            <Select
              {...register("stage")}
              placeholder="Select stage"
              options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Field>
        </div>
        <Field
          label="Revenue model(s)"
          hint="Pick all that apply."
        >
          <CheckboxGroup
            value={v.revenue_models ?? []}
            onChange={(arr) =>
              setValue("revenue_models", arr, { shouldValidate: true })
            }
            options={REVENUE_MODELS}
            aria-label="Revenue models"
          />
        </Field>
      </Section>

      {/* ---------- Team & legal ---------- */}
      <Section title="Team & legal">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Total employees">
            <Input
              type="number"
              min={0}
              placeholder="e.g. 12"
              {...register("total_employees")}
            />
          </Field>
          <Field label="Female employees">
            <Input
              type="number"
              min={0}
              placeholder="e.g. 4"
              {...register("female_employees")}
            />
          </Field>
        </div>
        <Field label="Founding team composition">
          <Select
            {...register("founding_team_composition")}
            placeholder="Select composition"
            options={[...FOUNDING_TEAM_COMPOSITIONS]}
          />
        </Field>
        <Field label="Registered with FBR?">
          <YesNo
            value={v.fbr_registered as boolean | undefined}
            onChange={(val) =>
              setValue("fbr_registered", val, { shouldValidate: true })
            }
            aria-label="FBR registered"
          />
        </Field>
        <Field label="Registered with SECP?">
          <YesNo
            value={v.secp_registered as boolean | undefined}
            onChange={(val) =>
              setValue("secp_registered", val, { shouldValidate: true })
            }
            aria-label="SECP registered"
          />
        </Field>
        <Field
          label="Are you currently a P@SHA member?"
          hint="Helps the committee fast-track members."
        >
          <YesNo
            value={v.is_pasha_member as boolean | undefined}
            onChange={(val) =>
              setValue("is_pasha_member", val, { shouldValidate: true })
            }
            aria-label="P@SHA member"
          />
        </Field>
      </Section>

      {/* ---------- Traction & funding ---------- */}
      <Section title="Traction & funding">
        <Field label="Current revenue (annual)">
          <Select
            {...register("revenue_band")}
            placeholder="Select range"
            options={[...REVENUE_BANDS]}
          />
        </Field>

        <Field label="Raised funding before?">
          <YesNo
            value={v.raised_funding as boolean | undefined}
            onChange={(val) =>
              setValue("raised_funding", val, { shouldValidate: true })
            }
            aria-label="Raised funding"
          />
        </Field>
        {v.raised_funding === true && (
          <Field label="Latest funding stage">
            <Select
              {...register("funding_stage")}
              placeholder="Select stage"
              options={[...FUNDING_STAGES]}
            />
          </Field>
        )}
        <Field label="Currently raising?">
          <YesNo
            value={v.currently_raising as boolean | undefined}
            onChange={(val) =>
              setValue("currently_raising", val, { shouldValidate: true })
            }
            aria-label="Currently raising"
          />
        </Field>

        <Field
          label="Pitch deck"
          hint="PDF, max 4MB. Optional — but very helpful for reviewers."
        >
          <FileUpload
            bucket="pitch-decks"
            value={v.pitch_deck_url}
            onChange={(url) =>
              setValue("pitch_deck_url", url || undefined, {
                shouldValidate: true,
              })
            }
            accept={{ "application/pdf": [".pdf"] }}
            maxSizeMB={4}
            label="Drop pitch deck or click to upload"
            hint="PDF only · max 4MB"
          />
        </Field>
        <Field label="Pitch video" hint="YouTube, Vimeo, or Google Drive link.">
          <Input
            type="url"
            {...register("pitch_video")}
            placeholder="https://youtu.be/..."
          />
        </Field>
      </Section>

      {/* ---------- Incubation ---------- */}
      <Section title="Incubation">
        <Field
          label="Have you been part of an NIC / Plan9 / LUMS LCE / similar?"
        >
          <YesNo
            value={v.incubated_in_nic as boolean | undefined}
            onChange={(val) =>
              setValue("incubated_in_nic", val, { shouldValidate: true })
            }
            aria-label="Incubation status"
          />
        </Field>
        {v.incubated_in_nic === true && (
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Incubation center">
              <Select
                {...register("nic_name")}
                placeholder="Select center"
                options={[...NIC_CENTERS]}
              />
            </Field>
            <Field label="Cohort">
              <Input {...register("nic_cohort")} placeholder="e.g. Cohort 12" />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                min={2000}
                max={new Date().getFullYear() + 1}
                {...register("nic_year")}
                placeholder="2024"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* ---------- Socials (new) ---------- */}
      <Section
        title="Socials"
        subtitle="Public-facing channels for the company. Shown on the directory profile."
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Company LinkedIn">
            <Input
              type="url"
              {...register("company_linkedin")}
              placeholder="https://linkedin.com/company/..."
            />
          </Field>
          <Field label="X / Twitter">
            <Input
              type="url"
              {...register("company_x")}
              placeholder="https://x.com/..."
            />
          </Field>
          <Field label="Instagram">
            <Input
              type="url"
              {...register("company_instagram")}
              placeholder="https://instagram.com/..."
            />
          </Field>
          <Field label="Facebook">
            <Input
              type="url"
              {...register("company_facebook")}
              placeholder="https://facebook.com/..."
            />
          </Field>
          <Field label="YouTube">
            <Input
              type="url"
              {...register("company_youtube")}
              placeholder="https://youtube.com/@..."
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

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
    <section className="space-y-5">
      <div className="border-t border-pasha-line/80 pt-5">
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
