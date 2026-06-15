"use client";

import type { StepProps } from "../ApplyForm";
import { Field } from "../Field";
import { Input, Textarea } from "@/components/ui/Input";
import { CheckboxGroup, YesNo } from "@/components/ui/RadioCard";
import { ENGAGEMENT_INTERESTS } from "@/lib/options";

/**
 * Step 3 — Recognition & Community
 *
 * Final step. Consolidates IP, awards/certs, engagement interests, community
 * opt-ins, and closing notes. Nothing here is required at submit-time — the
 * required-field bar lives entirely on Step 1 (startup) and Step 2 (primary
 * founder identity).
 */
export function Step3Recognition({ form }: StepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const v = watch();

  return (
    <div className="space-y-10">
      {/* ---------- IP ---------- */}
      <Section title="Intellectual property">
        <Field label="Patents or trademarks?">
          <YesNo
            value={v.has_patents as boolean | undefined}
            onChange={(val) =>
              setValue("has_patents", val, { shouldValidate: true })
            }
            aria-label="Has patents"
          />
        </Field>
        {v.has_patents === true && (
          <Field label="How many?" error={errors.patents_count?.message}>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 2"
              {...register("patents_count")}
            />
          </Field>
        )}
      </Section>

      {/* ---------- Awards & certifications ---------- */}
      <Section title="Awards & certifications">
        <Field
          label="Awards & recognition"
          hint="P@SHA ICT Awards, accelerator alumni, regional / global recognition. One per line."
        >
          <Textarea
            {...register("awards")}
            rows={4}
            placeholder={`P@SHA ICT Award 2024 — Best AI Startup\nWinner, MIT Solve 2023\nForbes 30 Under 30 Asia, 2024`}
          />
        </Field>
        <Field
          label="Certifications"
          hint="ISO, SOC 2, GDPR, ISMS, sector-specific (HIPAA, PCI-DSS, etc.)."
        >
          <Textarea
            {...register("certifications")}
            rows={3}
            placeholder={`ISO 27001:2022\nSOC 2 Type II (Aug 2024)\nPCI-DSS Level 1`}
          />
        </Field>
      </Section>

      {/* ---------- Engagement interests ---------- */}
      <Section
        title="What are you open to?"
        subtitle="Pick all that apply. Helps the committee match you to the right opportunities."
      >
        <CheckboxGroup
          value={v.engagement_interests ?? []}
          onChange={(arr) =>
            setValue("engagement_interests", arr, { shouldValidate: true })
          }
          options={ENGAGEMENT_INTERESTS}
          aria-label="Engagement interests"
        />
      </Section>

      {/* ---------- Community opt-ins ---------- */}
      <Section title="Community">
        <Field label="Join the PSEC WhatsApp Community">
          <YesNo
            value={v.whatsapp_optin}
            onChange={(val) =>
              setValue("whatsapp_optin", val, { shouldValidate: true })
            }
            aria-label="Join WhatsApp community"
          />
        </Field>
        <Field label="Join the PSEC Facebook Community">
          <YesNo
            value={v.facebook_optin}
            onChange={(val) =>
              setValue("facebook_optin", val, { shouldValidate: true })
            }
            aria-label="Join Facebook community"
          />
        </Field>
      </Section>

      {/* ---------- Closing notes ---------- */}
      <Section title="Anything else">
        <Field
          label="Closing notes"
          hint="Anything else we should know — context, story, requests."
        >
          <Textarea
            {...register("closing_notes")}
            rows={4}
            placeholder="Optional — share anything else you'd like the committee to know."
          />
        </Field>
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
