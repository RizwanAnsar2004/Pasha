// The input-type table, and the design array it produces.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FOUNDERS,
  INPUT_TYPES,
  STARTUP_NAME,
  resolveType,
  toDesign,
} from "../forms/form-design";
import { InputType, INPUT_TYPE_LABELS } from "../forms/form-enums";
import { field, section, applicationConfig } from "./fixtures/form-config";

describe("the table covers every input type", () => {
  it("every DB input type has an entry", () => {
    for (const value of Object.values(InputType)) {
      assert.ok(INPUT_TYPES[value], `InputType ${value} missing from INPUT_TYPES`);
    }
  });

  it("every DB input type has an admin label", () => {
    for (const value of Object.values(InputType)) {
      assert.ok(INPUT_TYPE_LABELS[value], `InputType ${value} missing from INPUT_TYPE_LABELS`);
    }
  });

  const nativeTypes: Record<number, string> = {
    [InputType.TEXT]: "text",
    [InputType.EMAIL]: "email",
    [InputType.URL]: "url",
    [InputType.PHONE]: "tel",
    [InputType.NUMBER]: "number",
    // DATE had no explicit arm in the old switch and reached the browser only by
    // falling through a default. Pinned so it cannot regress to a text box.
    [InputType.DATE]: "date",
  };

  for (const [type, html] of Object.entries(nativeTypes)) {
    it(`${INPUT_TYPE_LABELS[Number(type)]} → <input type="${html}">`, () =>
      assert.equal(INPUT_TYPES[Number(type)].htmlType, html));
  }
});

describe("resolveType — the only field-key-aware dispatch", () => {
  it("maps the founders GROUP to the hard-coded composite", () =>
    assert.equal(
      resolveType(field({ field_key: "founders", input_type: InputType.GROUP })),
      FOUNDERS
    ));

  it("maps startup_name to the duplicate-checking control", () =>
    assert.equal(
      resolveType(field({ field_key: "startup_name", input_type: InputType.TEXT })),
      STARTUP_NAME
    ));

  it("leaves any other key alone", () =>
    assert.equal(
      resolveType(field({ field_key: "tagline", input_type: InputType.TEXT })),
      InputType.TEXT
    ));

  // A repeater child that happens to reuse a reserved key must stay an ordinary
  // field of its declared type — otherwise a group with a `startup_name` column
  // would start firing directory lookups per row.
  it("does not apply either override to a nested field", () => {
    assert.equal(
      resolveType(field({ field_key: "startup_name", input_type: InputType.TEXT }), true),
      InputType.TEXT
    );
    assert.equal(
      resolveType(field({ field_key: "founders", input_type: InputType.GROUP }), true),
      InputType.GROUP
    );
  });
});

describe("toDesign", () => {
  const design = toDesign(applicationConfig());

  it("produces one item per configured field", () =>
    assert.equal(design.length, applicationConfig()[0].fields.length));

  it("gives every item its own schema", () => {
    for (const item of design) assert.ok(item.schema, `${item.fieldName} has no schema`);
  });

  it("carries the API's validation bag through untouched", () => {
    const year = design.find((i) => i.fieldName === "year_founded")!;
    assert.equal(year.validation.pattern, "^(19|20)\\d{2}$");
  });

  it("marks choice fields, so the Other companion is offered", () => {
    assert.equal(design.find((i) => i.fieldName === "primary_sector")!.choice, true);
    assert.equal(design.find((i) => i.fieldName === "tagline")!.choice, undefined);
  });

  it("records which step each field belongs to", () => {
    for (const item of design) assert.equal(item.step, 1);
  });

  it("expands the city composite into its four state keys", () => {
    const city = design.find((i) => i.inputType === InputType.CITY_COMPOSITE)!;
    assert.deepEqual([...city.expandsTo!], [
      "hq_city",
      "hq_other",
      "outside_pakistan",
      "hq_country",
    ]);
  });

  it("nests group children, each with their own schema", () => {
    const design2 = toDesign(
      section([
        field({
          field_key: "members",
          input_type: InputType.GROUP,
          repeatable: true,
          children: [
            field({ field_key: "name", input_type: InputType.TEXT, required: true }),
            field({ field_key: "email", input_type: InputType.EMAIL }),
          ],
        }),
      ])
    );
    const group = design2[0];
    assert.equal(group.children?.length, 2);
    assert.equal(group.children![1].fieldName, "email");
    assert.equal(group.children![1].schema.safeParse("nope").success, false);
    assert.equal(group.children![1].schema.safeParse("a@b.com").success, true);
  });

  it("skips inactive sections", () => {
    const cfg = section([field({ field_key: "x", input_type: InputType.TEXT })]);
    cfg[0].is_active = false;
    assert.deepEqual(toDesign(cfg), []);
  });
});
