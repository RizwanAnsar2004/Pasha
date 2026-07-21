// Unit tests for the runtime Zod builder that powers the dynamic form.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildZodSchema,
  routeValues,
  stepFieldKeys,
  type FormConfig,
  type FormFieldConfig,
} from "../forms/form-config";
import { InputType } from "../forms/form-enums";

let keyCounter = 0;
function field(partial: Partial<FormFieldConfig> & { field_key: string; input_type: number }): FormFieldConfig {
  return {
    id: `f${keyCounter++}`,
    label: partial.field_key,
    required: false,
    validation: {},
    visible: true,
    sort_order: 0,
    ...partial,
  };
}

function config(fields: FormFieldConfig[], step = 1): FormConfig {
  return [
    {
      id: "s1",
      key: "s1",
      title: "Section",
      subtitle: null,
      step,
      sort_order: 0,
      is_active: true,
      fields,
    },
  ];
}

describe("buildZodSchema — scalar fields", () => {
  it("required text rejects empty, accepts value", () => {
    const schema = buildZodSchema(config([field({ field_key: "name", input_type: InputType.TEXT, required: true, validation: { minLength: 2 } })]));
    assert.equal(schema.safeParse({ name: "" }).success, false);
    assert.equal(schema.safeParse({ name: "x" }).success, false); // < minLength 2
    assert.equal(schema.safeParse({ name: "ok" }).success, true);
  });

  it("required URL enforces http/https", () => {
    const schema = buildZodSchema(config([field({ field_key: "site", input_type: InputType.URL, required: true })]));
    assert.equal(schema.safeParse({ site: "javascript:alert(1)" }).success, false);
    assert.equal(schema.safeParse({ site: "https://ok.com" }).success, true);
    assert.equal(schema.safeParse({ site: "" }).success, false);
  });

  it("number coerces strings and applies min", () => {
    const schema = buildZodSchema(config([field({ field_key: "n", input_type: InputType.NUMBER, validation: { min: 1 } })]));
    const r = schema.safeParse({ n: "5" });
    assert.equal(r.success, true);
    if (r.success) assert.equal((r.data as { n: number }).n, 5);
    assert.equal(schema.safeParse({ n: "0" }).success, false); // below min
    assert.equal(schema.safeParse({ n: "" }).success, true); // optional
  });

  it("multiselect defaults to [] and required needs one", () => {
    const opt = buildZodSchema(config([field({ field_key: "m", input_type: InputType.MULTISELECT })]));
    const r = opt.safeParse({});
    assert.equal(r.success, true);
    if (r.success) assert.deepEqual((r.data as { m: string[] }).m, []);

    const req = buildZodSchema(config([field({ field_key: "m", input_type: InputType.MULTISELECT, required: true })]));
    assert.equal(req.safeParse({ m: [] }).success, false);
    assert.equal(req.safeParse({ m: ["a"] }).success, true);
  });

  it("yes/no coerces truthy strings", () => {
    const schema = buildZodSchema(config([field({ field_key: "b", input_type: InputType.YES_NO })]));
    const r = schema.safeParse({ b: "true" });
    assert.equal(r.success, true);
    if (r.success) assert.equal((r.data as { b: boolean }).b, true);
  });
});

describe("buildZodSchema — repeatable groups", () => {
  const memberGroup = field({
    field_key: "members",
    input_type: InputType.GROUP,
    repeatable: true,
    min_items: 1,
    max_items: 3,
    required: true,
    children: [
      field({ field_key: "name", input_type: InputType.TEXT, required: true, validation: { minLength: 2 } }),
      field({ field_key: "email", input_type: InputType.EMAIL }),
    ],
  });

  it("enforces min_items", () => {
    const schema = buildZodSchema(config([memberGroup]));
    assert.equal(schema.safeParse({ members: [] }).success, false);
    assert.equal(schema.safeParse({ members: [{ name: "Al", email: "" }] }).success, true);
  });

  it("validates each item and enforces max_items", () => {
    const schema = buildZodSchema(config([memberGroup]));
    assert.equal(schema.safeParse({ members: [{ name: "x", email: "" }] }).success, false); // name < 2
    assert.equal(
      schema.safeParse({ members: [{ name: "Al" }, { name: "Bo" }, { name: "Cy" }, { name: "Di" }] }).success,
      false // > max 3
    );
  });
});

describe("buildZodSchema — conditional required", () => {
  const schema = buildZodSchema(
    config([
      field({ field_key: "has_x", input_type: InputType.YES_NO }),
      field({ field_key: "x_count", input_type: InputType.NUMBER, required: true, conditional: { field_key: "has_x", equals: true } }),
    ])
  );

  it("skips requirement when condition not met", () => {
    assert.equal(schema.safeParse({ has_x: false }).success, true);
  });
  it("enforces requirement when condition met", () => {
    assert.equal(schema.safeParse({ has_x: true }).success, false);
    assert.equal(schema.safeParse({ has_x: true, x_count: 3 }).success, true);
  });
});

describe("city composite + routing", () => {
  const cfg = config([
    field({ field_key: "startup_name", input_type: InputType.TEXT, required: true, column_map: "startup_name" }),
    field({ field_key: "location", input_type: InputType.CITY_COMPOSITE, column_map: null }),
    field({ field_key: "extra", input_type: InputType.TEXT }), // no column_map → answers
  ]);

  it("requires city when not outside Pakistan", () => {
    const schema = buildZodSchema(cfg);
    assert.equal(schema.safeParse({ startup_name: "Acme", outside_pakistan: false }).success, false);
    assert.equal(schema.safeParse({ startup_name: "Acme", outside_pakistan: false, hq_city: "Lahore" }).success, true);
  });

  it("routeValues splits columns vs answers", () => {
    const { columns, answers } = routeValues(cfg, {
      startup_name: "Acme",
      hq_city: "Lahore",
      hq_other: "",
      outside_pakistan: false,
      hq_country: "",
      extra: "hello",
    });
    assert.equal(columns.startup_name, "Acme");
    assert.equal(columns.hq_city, "Lahore");
    assert.equal(answers.extra, "hello");
    assert.equal("extra" in columns, false);
  });

  it("stepFieldKeys expands the city composite", () => {
    const keys = stepFieldKeys(cfg, 1);
    assert.ok(keys.includes("hq_city"));
    assert.ok(keys.includes("hq_country"));
    assert.ok(keys.includes("startup_name"));
  });
});

describe("HEADING fields are ignored everywhere", () => {
  const cfg = config([
    field({ field_key: "h1", input_type: InputType.HEADING, label: "Basics" }),
    field({ field_key: "name", input_type: InputType.TEXT, required: true, column_map: "startup_name" }),
  ]);

  it("not part of the schema (extra heading key allowed, ignored)", () => {
    const schema = buildZodSchema(cfg);
    // A value under the heading key is simply not validated/required.
    assert.equal(schema.safeParse({ name: "Acme" }).success, true);
  });

  it("excluded from stepFieldKeys", () => {
    const keys = stepFieldKeys(cfg, 1);
    assert.ok(keys.includes("name"));
    assert.equal(keys.includes("h1"), false);
  });

  it("not routed to columns or answers", () => {
    const { columns, answers } = routeValues(cfg, { name: "Acme", h1: "ignored" });
    assert.equal(columns.startup_name, "Acme");
    assert.equal("h1" in columns, false);
    assert.equal("h1" in answers, false);
  });
});

describe("section = step (one section per step)", () => {
  const cfg: FormConfig = [
    { id: "a", key: "a", title: "Startup", subtitle: null, step: 1, sort_order: 0, is_active: true, fields: [field({ field_key: "startup_name", input_type: InputType.TEXT })] },
    { id: "b", key: "b", title: "Founders", subtitle: null, step: 2, sort_order: 1, is_active: true, fields: [field({ field_key: "founders", input_type: InputType.GROUP, repeatable: true, min_items: 1 })] },
    { id: "c", key: "c", title: "Recognition", subtitle: null, step: 3, sort_order: 2, is_active: true, fields: [field({ field_key: "closing_notes", input_type: InputType.TEXTAREA })] },
  ];

  it("each step maps to exactly one section's keys", () => {
    assert.deepEqual(stepFieldKeys(cfg, 1), ["startup_name"]);
    assert.deepEqual(stepFieldKeys(cfg, 3), ["closing_notes"]);
  });
});
