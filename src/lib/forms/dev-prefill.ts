// Local-only debug prefill: fills the apply form with a plausible, schema-valid
// application so a tester can reach the last step without typing six pages.
//
// Split out of form-config.ts because it is the one consumer that legitimately
// needs per-input-type sample data, and mixing it in with the config layer made
// that file look like it still owned the input-type dispatch.

import { InputType } from "@/lib/forms/form-enums";
import {
  resolveOptions,
  type FormConfig,
  type FormFieldConfig,
} from "@/lib/forms/form-config";

type OptionRegistry = Record<string, { value: string; label: string }[]>;

const DEV_COMPANY: Record<string, unknown> = {
  startup_name: "Lumen Robotics",
  tagline: "Autonomous warehouse robots for mid-market logistics",
  website: "https://lumenrobotics.io",
  year_founded: "2021",
  description:
    "Lumen Robotics builds autonomous mobile robots that automate order " +
    "picking and inventory counts for mid-market warehouses across North America.",
  secondary_sector: "Robotics & Automation",
  // Structured awards group (title / year / description per row).
  awards: [
    {
      title: "Forbes AI 50",
      year: "2024",
      description: "Named to the annual list of the 50 most promising AI companies.",
    },
  ],
  certifications: "ISO 9001, SOC 2 Type II",
  closing_notes: "Created via local debug prefill.",
  company_linkedin: "https://www.linkedin.com/company/lumen-robotics",
  company_x: "https://x.com/lumenrobotics",
  company_instagram: "https://www.instagram.com/lumenrobotics",
  company_facebook: "https://www.facebook.com/lumenrobotics",
  company_youtube: "https://www.youtube.com/@lumenrobotics",
};

// Western founders, schema-valid (primary needs name/role/email/mobile).
const DEV_FOUNDERS = [
  {
    name: "Daniel Carter",
    role: "Co-founder & CEO",
    email: "daniel@lumenrobotics.io",
    mobile: "+1 (512) 555-0142",
    linkedin: "https://www.linkedin.com/in/daniel-carter",
    is_primary: true,
  },
  {
    name: "Emily Nguyen",
    role: "Co-founder & CTO",
    email: "emily@lumenrobotics.io",
    mobile: "+1 (512) 555-0188",
    linkedin: "https://www.linkedin.com/in/emily-nguyen",
    is_primary: false,
  },
];

export function buildDevPrefill(
  config: FormConfig,
  registry?: OptionRegistry
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of config) {
    for (const field of section.fields) {
      if (field.input_type === InputType.HEADING) continue;
      if (field.input_type === InputType.CITY_COMPOSITE) {
        // Western HQ — outside Pakistan, so only hq_country is required.
        out.outside_pakistan = true;
        out.hq_city = "";
        out.hq_other = "";
        out.hq_country = "United States";
        continue;
      }
      if (field.input_type === InputType.GROUP && field.field_key === "founders") {
        out.founders = DEV_FOUNDERS.map((f) => ({ ...f }));
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(DEV_COMPANY, field.field_key)) {
        out[field.field_key] = DEV_COMPANY[field.field_key];
        continue;
      }
      out[field.field_key] = devValueForField(field, registry);
    }
  }
  return out;
}

function devValueForField(field: FormFieldConfig, registry?: OptionRegistry): unknown {
  switch (field.input_type) {
    case InputType.EMAIL:
      return "founder@example.com";
    case InputType.URL:
      return "https://example.com";
    case InputType.PHONE:
      return "+923001234567";
    case InputType.NUMBER:
      return String(field.validation?.min ?? 10);
    case InputType.YES_NO:
      return true;
    case InputType.DATE:
      return "2024-01-15";
    case InputType.TEXTAREA:
    case InputType.RICH_TEXT: {
      const text =
        "This is sample content generated for local testing of the registration flow.";
      return field.input_type === InputType.RICH_TEXT ? `<p>${text}</p>` : text;
    }
    case InputType.SELECT:
    case InputType.RADIO_CARDS: {
      const opts = resolveOptions(field, registry);
      return opts[0]?.value ?? "";
    }
    case InputType.MULTISELECT: {
      const opts = resolveOptions(field, registry);
      return opts[0] ? [opts[0].value] : [];
    }
    case InputType.GROUP: {
      const item = devGroupValue(field.children ?? [], registry);
      if (field.repeatable) {
        const count = Math.max(field.min_items ?? 0, 1);
        return Array.from({ length: count }, () => ({ ...item }));
      }
      return item;
    }
    case InputType.FILE_UPLOAD:
      // Files can't be synthesised here — leave empty; testers attach manually.
      return "";
    default: {
      // Plain text: honour minLength so the value clears validation.
      const min = field.validation?.minLength ?? 0;
      const base =
        field.label && field.label.toLowerCase().includes("name")
          ? "Test Startup"
          : "Sample text";
      return base.length >= min ? base : base.padEnd(min, " x").trim();
    }
  }
}

function devGroupValue(
  children: FormFieldConfig[],
  registry?: OptionRegistry
): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const c of children) {
    if (c.input_type === InputType.HEADING) continue;
    item[c.field_key] = devValueForField(c, registry);
  }
  return item;
}
