import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeHref, safeImageSrc } from "../validators/safe-url";
import { buildZodSchema } from "../forms/form-config";
import { applicationConfig, validPayload, URL_FIELDS } from "./fixtures/form-config";

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

describe("config-built schema — URL fields reject unsafe schemes", () => {
  const schema = buildZodSchema(applicationConfig());
  const parse = (over: Record<string, unknown>) => schema.safeParse({ ...validPayload(), ...over });

  // `website` is required at submit, so the "empty → undefined" expectation only
  // applies to the genuinely-optional URL fields.
  const OPTIONAL_URL_FIELDS = URL_FIELDS.filter((f) => f !== "website");

  for (const field of URL_FIELDS) {
    it(`${field}: javascript: URL is REJECTED`, () => {
      assert.equal(parse({ [field]: "javascript:alert(1)" }).success, false);
    });

    it(`${field}: data: URL is REJECTED`, () => {
      assert.equal(parse({ [field]: "data:text/html,<script>" }).success, false);
    });

    it(`${field}: vbscript: URL is REJECTED`, () => {
      assert.equal(parse({ [field]: "vbscript:msgbox" }).success, false);
    });

    it(`${field}: a host with no dot is REJECTED`, () => {
      assert.equal(parse({ [field]: "https://not-a-valid-url-at-all" }).success, false);
    });

    it(`${field}: https URL is ACCEPTED`, () => {
      const r = parse({ [field]: "https://example.com" });
      assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
    });
  }

  for (const field of OPTIONAL_URL_FIELDS) {
    it(`${field}: empty string still coerces to undefined`, () => {
      const r = parse({ [field]: "" });
      assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
      if (r.success) assert.equal((r.data as Record<string, unknown>)[field], undefined);
    });
  }
});
