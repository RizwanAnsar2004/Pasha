import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeHref, safeImageSrc } from "../validators/safe-url";
import { submissionSchema } from "../forms/schema";

describe("safeHref - XSS prevention", () => {
  const cases: { input: string; expectSafe: boolean; note: string }[] = [
    { input: "javascript:alert(1)", expectSafe: false, note: "javascript:" },
    { input: "JavaScript:alert(1)", expectSafe: false, note: "case-insensitive javascript" },
    { input: "  javascript:alert(1)  ", expectSafe: false, note: "whitespace-prefixed" },
    { input: "data:text/html,<script>", expectSafe: false, note: "data:" },
    { input: "vbscript:msgbox", expectSafe: false, note: "vbscript:" },
    { input: "file:///etc/passwd", expectSafe: false, note: "file:" },
    { input: "https://example.com", expectSafe: true, note: "https" },
    { input: "http://example.com", expectSafe: true, note: "http" },
    { input: "mailto:test@example.com", expectSafe: true, note: "mailto" },
    { input: "", expectSafe: false, note: "empty" },
    { input: "   ", expectSafe: false, note: "whitespace only" },
    { input: "not a url", expectSafe: false, note: "garbage" },
    { input: "ftp://files.example.com", expectSafe: false, note: "ftp" },
  ];

  for (const c of cases) {
    it(`${c.note}: ${JSON.stringify(c.input)}`, () => {
      const result = safeHref(c.input);
      if (c.expectSafe) {
        assert.notEqual(result, "#", `should produce safe href, got '${result}'`);
      } else {
        assert.equal(result, "#", `should be '#' for unsafe input, got '${result}'`);
      }
    });
  }

  it("handles null and undefined", () => {
    assert.equal(safeHref(null), "#");
    assert.equal(safeHref(undefined), "#");
  });
});

describe("safeImageSrc - only http/https for images", () => {
  it("accepts https", () => {
    assert.equal(safeImageSrc("https://cdn.example.com/img.png"), "https://cdn.example.com/img.png");
  });
  it("rejects javascript:", () => {
    assert.equal(safeImageSrc("javascript:alert(1)"), "");
  });
  it("rejects data:", () => {
    assert.equal(safeImageSrc("data:text/html,<script>"), "");
  });
  it("rejects mailto: (not an image)", () => {
    assert.equal(safeImageSrc("mailto:test@x.com"), "");
  });
});

describe("submissionSchema - URL fields reject unsafe schemes", () => {
  // v2 payload shape: founders[] array + new top-level required fields.
  const REQUIRED_ONLY = {
    startup_name: "BearPlex",
    website: "https://bearplex.com",
    year_founded: "2020",
    description: "x".repeat(60),
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

  // Top-level URL fields.
  const URL_FIELDS = [
    "website",
    "logo_url",
    "pitch_deck_url",
    "pitch_video",
    "company_linkedin",
    "company_x",
    "company_instagram",
    "company_facebook",
    "company_youtube",
  ];

  // website is now required at submit-time, so the "empty → undefined" expectation only applies to genuinely-optional URL fields.
  const OPTIONAL_URL_FIELDS = URL_FIELDS.filter((f) => f !== "website");

  for (const field of URL_FIELDS) {
    it(`${field}: javascript: URL is REJECTED`, () => {
      const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, [field]: "javascript:alert(1)" });
      assert.equal(r.success, false, `${field} should reject javascript:`);
    });

    it(`${field}: data: URL is REJECTED`, () => {
      const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, [field]: "data:text/html,<script>" });
      assert.equal(r.success, false, `${field} should reject data:`);
    });

    it(`${field}: vbscript: URL is REJECTED`, () => {
      const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, [field]: "vbscript:msgbox" });
      assert.equal(r.success, false, `${field} should reject vbscript:`);
    });

    it(`${field}: https URL is ACCEPTED`, () => {
      const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, [field]: "https://example.com" });
      assert.equal(r.success, true, `${field} should accept https`);
    });
  }

  for (const field of OPTIONAL_URL_FIELDS) {
    it(`${field}: empty string still coerces to undefined`, () => {
      const r = submissionSchema.safeParse({ ...REQUIRED_ONLY, [field]: "" });
      assert.equal(r.success, true, JSON.stringify(r.success === false && r.error.format()));
      if (r.success) assert.equal((r.data as Record<string, unknown>)[field], undefined);
    });
  }
});
