// Schema unit tests for the v2 (3-step) form.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { submissionSchema } from "../forms/schema";

// Minimum payload that should always parse.
const REQUIRED_ONLY = {
  startup_name: "BearPlex",
  website: "https://bearplex.com",
  year_founded: "2020",
  description: "x".repeat(50),
  hq_city: "Lahore",
  primary_sector: "Artificial Intelligence (AI)",
  stage: "Growth (Series B,C)",
  founders: [
    {
      name: "Hamad Pervaiz",
      role: "CEO",
      email: "hamad@bearplex.com",
      mobile: "03001234567",
      is_primary: true,
    },
  ],
};

describe("submissionSchema v2 — happy paths", () => {
  it("minimum-required payload parses", () => {
    const r = submissionSchema.safeParse(REQUIRED_ONLY);
    assert.equal(r.success, true, JSON.stringify(r.success === false && r.error.format()));
    if (r.success) {
      assert.equal(r.data.startup_name, "BearPlex");
      assert.equal(r.data.founders[0].name, "Hamad Pervaiz");
      assert.equal(r.data.founders[0].is_primary, true);
      assert.equal(r.data.whatsapp_optin, false);
      assert.equal(r.data.facebook_optin, false);
      assert.deepEqual(r.data.revenue_models, []);
    }
  });

  it("full payload with all v2 fields parses", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      tagline: "Faster healthcare for Pakistan",
      logo_url: "https://example.com/logo.png",
      hq_other: undefined,
      outside_pakistan: false,
      secondary_sector: "Fintech",
      business_model: "Business to Business (B2B)",
      revenue_models: ["Subscription", "Licensing"],
      total_employees: 65,
      female_employees: 12,
      founding_team_composition: "mixed",
      fbr_registered: true,
      secp_registered: true,
      is_pasha_member: true,
      revenue_band: "1m+",
      raised_funding: false,
      currently_raising: false,
      pitch_deck_url: "https://example.com/deck.pdf",
      pitch_video: "https://youtu.be/abc",
      incubated_in_nic: true,
      nic_name: "NIC Lahore",
      nic_cohort: "Cohort 13",
      nic_year: 2024,
      company_linkedin: "https://linkedin.com/company/bearplex",
      company_x: "https://x.com/bearplex",
      has_patents: true,
      patents_count: 3,
      awards: "PASHA ICT Award 2024",
      certifications: "ISO 27001",
      engagement_interests: ["Mentorship (receive)"],
      whatsapp_optin: true,
      facebook_optin: true,
      closing_notes: "Excited to apply",
    });
    assert.equal(r.success, true, JSON.stringify(r.success === false && r.error.format()));
  });
});

describe("submissionSchema v2 — newly-required fields fail when missing", () => {
  function omit<T extends Record<string, unknown>>(o: T, k: keyof T): Omit<T, typeof k> {
    const c = { ...o };
    delete c[k];
    return c;
  }

  it("website required", () => {
    const r = submissionSchema.safeParse(omit(REQUIRED_ONLY, "website"));
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("website"));
    }
  });

  it("primary_sector required", () => {
    const r = submissionSchema.safeParse(omit(REQUIRED_ONLY, "primary_sector"));
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("primary_sector"));
    }
  });

  it("stage required", () => {
    const r = submissionSchema.safeParse(omit(REQUIRED_ONLY, "stage"));
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("stage"));
    }
  });

  it("year_founded required", () => {
    const r = submissionSchema.safeParse(omit(REQUIRED_ONLY, "year_founded"));
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("year_founded"));
    }
  });

  it("year_founded as 'xyz' fails (regex check)", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, year_founded: "xyz" });
    assert.equal(r.success, false);
  });

  it("year_founded in the future fails", () => {
    const future = String(new Date().getFullYear() + 1);
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, year_founded: future });
    assert.equal(r.success, false);
  });

  it("website with javascript: scheme fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      website: "javascript:alert(1)",
    });
    assert.equal(r.success, false);
  });
});

describe("submissionSchema v2 — founders array", () => {
  it("empty founders array fails", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, founders: [] });
    assert.equal(r.success, false);
  });

  it("founder with missing role fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [{ name: "Hamad", email: "h@b.com", mobile: "03001234567", is_primary: true }],
    });
    assert.equal(r.success, false);
  });

  it("primary founder without email fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [{ name: "Hamad", role: "CEO", mobile: "03001234567", is_primary: true }],
    });
    assert.equal(r.success, false);
  });

  it("primary founder without mobile fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [{ name: "Hamad", role: "CEO", email: "h@b.com", is_primary: true }],
    });
    assert.equal(r.success, false);
  });

  it("founder mobile with letters fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [
        {
          ...REQUIRED_ONLY.founders[0],
          mobile: "abc123",
        },
      ],
    });
    assert.equal(r.success, false);
  });

  it("secondary founder without email/mobile is OK", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [
        ...REQUIRED_ONLY.founders,
        { name: "Aisha", role: "CTO", is_primary: false },
      ],
    });
    assert.equal(r.success, true, JSON.stringify(r.success === false && r.error.format()));
  });

  it("no founder marked primary → first auto-promoted (still passes)", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [
        {
          name: "Hamad",
          role: "CEO",
          email: "h@b.com",
          mobile: "03001234567",
          is_primary: false,
        },
      ],
    });
    assert.equal(r.success, true);
  });

  it("LinkedIn javascript: scheme on founder fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [
        {
          ...REQUIRED_ONLY.founders[0],
          linkedin: "javascript:alert(1)",
        },
      ],
    });
    assert.equal(r.success, false);
  });
});

describe("submissionSchema v2 — city / country branch", () => {
  it("outside_pakistan=true + hq_country=Germany passes", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      outside_pakistan: true,
      hq_city: undefined,
      hq_country: "Germany",
    });
    assert.equal(r.success, true);
  });

  it("outside_pakistan=true with empty hq_country fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      outside_pakistan: true,
      hq_city: undefined,
      hq_country: "",
    });
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("hq_country"));
    }
  });

  it("outside_pakistan=false + hq_city='Other' + hq_other='Bhakkar' passes", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      outside_pakistan: false,
      hq_city: "Other",
      hq_other: "Bhakkar",
    });
    assert.equal(r.success, true);
  });

  it("outside_pakistan=false + hq_city='Other' + empty hq_other fails", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      outside_pakistan: false,
      hq_city: "Other",
      hq_other: "",
    });
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("hq_other"));
    }
  });
});

describe("submissionSchema v2 — \"Other\" free-text capture", () => {
  it("primary_sector='Other' + primary_sector_other passes", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      primary_sector: "Other",
      primary_sector_other: "Quantum Computing",
    });
    assert.equal(r.success, true);
  });

  it("primary_sector='Other' with no text fails on the _other path", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, primary_sector: "Other" });
    assert.equal(r.success, false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("primary_sector_other"));
    }
  });

  it("whitespace-only text is rejected", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      primary_sector: "Other",
      primary_sector_other: "   ",
    });
    assert.equal(r.success, false);
  });

  it("a normal sector does not require the _other text", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, primary_sector: "Fintech" });
    assert.equal(r.success, true);
  });

  it("multi-select revenue_models containing 'Other' requires the text", () => {
    const missing = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      revenue_models: ["Subscription", "Other"],
    });
    assert.equal(missing.success, false);
    if (!missing.success) {
      const paths = missing.error.issues.map((i) => i.path.join("."));
      assert.ok(paths.includes("revenue_models_other"));
    }

    const filled = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      revenue_models: ["Subscription", "Other"],
      revenue_models_other: "Revenue share",
    });
    assert.equal(filled.success, true);
  });

  it("multi-select without 'Other' does not require the text", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      revenue_models: ["Subscription", "Freemium"],
    });
    assert.equal(r.success, true);
  });
});

describe("submissionSchema v2 — type coercion (regression)", () => {
  it("is_pasha_member as string 'true' coerces to true", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, is_pasha_member: "true" });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.is_pasha_member, true);
  });

  it("total_employees as '12' coerces to 12 (total_founders/female_founders removed)", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, total_employees: "12" });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.total_employees, 12);
  });

  it("revenue_models with null entries are filtered", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      revenue_models: ["Subscription", "", null, "Licensing"],
    });
    assert.equal(r.success, true);
    if (r.success)
      assert.deepEqual(r.data.revenue_models, ["Subscription", "Licensing"]);
  });
});

describe("submissionSchema v2 — XSS / SQL / Unicode (regression)", () => {
  it("XSS payload in startup_name accepts verbatim (sanitize on render)", () => {
    const xss = "<script>alert(1)</script>";
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, startup_name: xss });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.startup_name, xss);
  });

  it("SQL-injection string accepts verbatim", () => {
    const sqli = "'; DROP TABLE submissions; --";
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, startup_name: sqli });
    assert.equal(r.success, true);
  });

  it("Urdu RTL text accepts", () => {
    const urdu = "حمد پرویز";
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      founders: [{ ...REQUIRED_ONLY.founders[0], name: urdu }],
    });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.founders[0].name, urdu);
  });

  it("emoji in startup_name accepts", () => {
    const r = submissionSchema.safeParse({
      ...REQUIRED_ONLY,
      startup_name: "BearPlex 🐻🚀",
    });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.startup_name, "BearPlex 🐻🚀");
  });

  it("description boundary at 50 chars passes", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, description: "x".repeat(50) });
    assert.equal(r.success, true);
  });

  it("description boundary at 2001 chars fails", () => {
    const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, description: "x".repeat(2001) });
    assert.equal(r.success, false);
  });

  it("safeParse does NOT throw on array passed where string expected", () => {
    let didThrow = false;
    let r;
    try {
      r = submissionSchema.safeParse({ ...REQUIRED_ONLY, startup_name: ["Bear"] });
    } catch {
      didThrow = true;
    }
    assert.equal(didThrow, false);
    assert.equal(r!.success, false);
  });
});
