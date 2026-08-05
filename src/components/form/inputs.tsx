"use client";

// The form renderer: one switch over the design array, plus the chrome around
// each control.
//
// `FormField` takes one FormItem — the same object that carries the field's own
// Zod schema in @/lib/forms/form-design — and draws it. Everything about how an
// input type looks is in the switch below; everything about how it validates is
// in that file. Adding an input type is one case here and one entry there.
//
// Split from form-design.ts only because /api/submit and the draft route call
// getSchema() on the server, and importing these controls there would drag
// CKEditor and react-dropzone into that graph.

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/form/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { SelectField } from "@/components/form/SelectField";
import { RichTextField } from "@/components/form/RichTextField";
import { CheckboxGroup, RadioCardGroup, YesNo } from "@/components/ui/RadioCard";
import { FileUpload } from "@/components/form/FileUpload";
import { CityField } from "@/components/form/controls/CityField";
import { FoundersRepeater } from "@/components/form/controls/FoundersRepeater";
import { PhoneField } from "@/components/form/controls/PhoneField";
import { StartupNameField } from "@/components/form/controls/StartupNameField";
import { useOptionRegistry } from "@/components/form/OptionListsContext";
import { coerceOptionValue, coerceOptionValues } from "@/lib/options/choice";
import { urlRegister } from "@/lib/forms/normalize-url";
import { InputType } from "@/lib/forms/form-enums";
import {
  FOUNDERS,
  STARTUP_NAME,
  htmlToPlainText,
  isOtherSelected,
  otherFieldKey,
  runRules,
  type Choice,
  type FormItem,
  type RuleIssue,
} from "@/lib/forms/form-design";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Live cross-field rule errors
//
// The schema enforces the same RULES at submit, on client and server; these are
// the as-you-type copies, so an applicant is not carried through six steps
// before being told two figures contradict each other.
//
// Computed once by the form shell and passed down through context rather than
// per field: every rule reads several values, so evaluating them inside each
// field would mean every field subscribing to the whole form.

/** Every rule violation — for the step gate and the submit gate, which must
 *  block on a rule the applicant has not looked at yet. */
export function ruleIssuesFor(
  values: Record<string, unknown>,
  design: FormItem[]
): RuleIssue[] {
  const labels = Object.fromEntries(
    design.filter((i) => i.label).map((i) => [i.fieldName, i.label!])
  );
  return runRules(values, labels);
}

/**
 * The subset to show next to a field right now, keyed by path.
 *
 * A comparison is held back until BOTH its fields have been touched: with SAM
 * already filled, typing the first digit of a larger TAM briefly looks like an
 * inversion, and flashing an error at someone mid-keystroke reads as a bug.
 */
export function visibleRuleErrors(
  issues: RuleIssue[],
  touchedFields: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    if (!touchedFields[issue.path]) continue;
    if (issue.comparedTo && !touchedFields[issue.comparedTo]) continue;
    // First rule to claim a path wins, matching how RHF shows one error.
    if (!(issue.path in out)) out[issue.path] = issue.message;
  }
  return out;
}

// Defaults to empty, so a field rendered outside a form shell shows no rule
// errors rather than crashing.
const RuleErrors = createContext<Record<string, string>>({});

export function RuleErrorsProvider({
  errors,
  children,
}: {
  errors: Record<string, string>;
  children: ReactNode;
}) {
  return <RuleErrors.Provider value={errors}>{children}</RuleErrors.Provider>;
}

// ---------------------------------------------------------------------------

// Read a nested error message off RHF's errors object by dotted path.
function errorAt(errors: unknown, path: string): string | undefined {
  let cur: unknown = errors;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  const msg = (cur as { message?: unknown } | undefined)?.message;
  return typeof msg === "string" ? msg : undefined;
}

/** Admin-managed option lists win over the code constants baked into the item. */
function useChoices(item: FormItem): Choice[] {
  const registry = useOptionRegistry();
  const fromRegistry = item.optionsSource ? registry[item.optionsSource] : undefined;
  return fromRegistry?.length ? fromRegistry : item.options ?? [];
}

type ControlProps = {
  item: FormItem;
  /** Dotted RHF path. Differs from item.fieldName inside a repeatable group. */
  path: string;
  value: unknown;
  label?: string;
  hint?: ReactNode;
  error?: string;
};

// ===========================================================================
// FormField — chrome + the switch
// ===========================================================================

/**
 * Renders one field of the design array: conditional visibility, the
 * label/hint/error wrapper, the character counter, the "Other" companion input,
 * and the control itself.
 *
 * `namePrefix` is set for a field inside a repeatable group.
 */
export function FormField({ item, namePrefix }: { item: FormItem; namePrefix?: string }) {
  const form = useFormContext();
  const path = namePrefix ? `${namePrefix}.${item.fieldName}` : item.fieldName;

  const condName = item.conditional
    ? namePrefix
      ? `${namePrefix}.${item.conditional.fieldName}`
      : item.conditional.fieldName
    : "__noop_cond__";
  const condValue = useWatch({ control: form.control, name: condName });
  const value = useWatch({ control: form.control, name: path });
  const ruleError = useContext(RuleErrors)[path];

  // Legacy drafts of text / textarea fields (e.g. the one-line description that
  // used to be a rich-text editor) hold HTML. Strip the tags once so the plain
  // <textarea> shows readable text instead of "<p>…</p>" — and the cleaned value
  // is what then autosaves back.
  const isText =
    item.inputType === InputType.TEXT || item.inputType === InputType.TEXTAREA;
  useEffect(() => {
    if (!isText) return;
    if (typeof value === "string" && /<[^>]+>/.test(value)) {
      form.setValue(path, htmlToPlainText(value), { shouldDirty: false });
    }
  }, [isText, value, path, form]);

  // The city composite owns its own visibility, so it resolves before the
  // conditional check below.
  if (!namePrefix && item.expandsTo) return <CityField />;

  if (item.conditional && condValue !== item.conditional.equals) return null;
  if (item.hidden) return null;

  // HEADING — a label-only divider for visual sub-grouping within a step.
  if (item.valueless) {
    return (
      <div className="flex items-center gap-3 pt-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-pasha-red font-semibold whitespace-nowrap">
          {item.label}
        </h3>
        <span className="h-px flex-1 bg-pasha-line/70" />
      </div>
    );
  }

  // GROUP — a subsection or repeater. Handled here rather than in the switch
  // because it recurses back into this component.
  if (item.typeKey === InputType.GROUP) return <Group item={item} path={path} />;

  const maxLen = item.validation?.maxLength;
  // A rule violation wins over the schema message: it is the more specific
  // explanation, and two messages under one input read as two separate faults.
  const error = ruleError ?? errorAt(form.formState.errors, path);

  // Live character counter for length-capped text. Sits on the hint row,
  // right-aligned, warming to amber near the cap and red once over.
  let hint: ReactNode = item.hint;
  if (maxLen) {
    const len = typeof value === "string" ? value.length : 0;
    const tone =
      len > maxLen ? "text-pasha-red" : len >= maxLen * 0.9 ? "text-amber-600" : "text-pasha-muted";
    hint = (
      <span className="flex items-baseline justify-between gap-3">
        <span>{item.hint}</span>
        <span aria-hidden className={cn("shrink-0 tabular-nums", tone)}>
          {len}/{maxLen}
        </span>
      </span>
    );
  }

  const control = <Control item={item} path={path} value={value} label={item.label} hint={hint} error={error} />;

  // Controls that override the hint or error slot draw their own <Field>.
  const wrapped = item.ownsChrome ? (
    control
  ) : (
    <Field
      label={item.label}
      hint={hint}
      required={item.required}
      error={error}
      customControl={item.customControl}
    >
      {control}
    </Field>
  );

  if (!item.choice || !isOtherSelected(value)) return wrapped;

  // Companion free-text input, revealed when the applicant picks "Other" so the
  // real answer is captured instead of being flattened to the literal word.
  const otherPath = namePrefix
    ? `${namePrefix}.${otherFieldKey(item.fieldName)}`
    : otherFieldKey(item.fieldName);
  return (
    <>
      {wrapped}
      <div className="mt-3">
        <Field label="Please specify" required error={errorAt(form.formState.errors, otherPath)}>
          <Input placeholder="Type your answer" maxLength={120} {...form.register(otherPath)} />
        </Field>
      </div>
    </>
  );
}

/** THE switch. One case per input type. */
function Control(p: ControlProps) {
  switch (p.item.typeKey) {
    case InputType.TEXTAREA:
      return <TextareaInput {...p} />;

    case InputType.NUMBER:
      return <NumberInput {...p} />;

    case InputType.RICH_TEXT:
      return <RichTextField name={p.path} maxLength={p.item.validation?.maxLength} />;

    case InputType.SELECT:
      return <SelectInput {...p} />;

    case InputType.MULTISELECT:
      return <MultiSelectInput {...p} />;

    case InputType.RADIO_CARDS:
      return <RadioCardsInput {...p} />;

    case InputType.YES_NO:
      return <YesNoInput {...p} />;

    case InputType.FILE_UPLOAD:
      return <FileInput {...p} />;

    case InputType.PHONE:
      return <PhoneInput {...p} />;

    // A TEXT field named startup_name: same validation, but the control asks the
    // server whether the name is already listed while the applicant types.
    case STARTUP_NAME:
      return <StartupNameInput {...p} />;

    // A GROUP with no child rows in the DB — see §5 of form-design.ts.
    case FOUNDERS:
      return (
        <Field label={p.label} hint={p.hint}>
          <FoundersRepeater />
        </Field>
      );

    // TEXT, EMAIL, URL, DATE — one control, native type from the design item.
    default:
      return <TextInput {...p} />;
  }
}

// ===========================================================================
// Controls
// ===========================================================================

function TextInput({ item, path }: ControlProps) {
  const form = useFormContext();
  const type = item.htmlType ?? "text";
  // URL fields normalise on blur ("acme.com" → "https://acme.com"), which needs
  // its own register wrapper rather than the plain one.
  const register = type === "url" ? urlRegister(form, path) : form.register(path);
  return (
    <Input
      type={type}
      placeholder={item.placeholder}
      maxLength={item.validation?.maxLength}
      {...register}
    />
  );
}

function TextareaInput({ item, path }: ControlProps) {
  const form = useFormContext();
  return (
    <Textarea
      placeholder={item.placeholder}
      maxLength={item.validation?.maxLength}
      {...form.register(path)}
    />
  );
}

/**
 * Digits only.
 *
 * type="text" with inputMode="numeric" rather than type="number": the native
 * spinner accepts "e", "+" and "-" and scrolls the value when the wheel passes
 * over it. onChange strips everything but digits, so the form state is always a
 * number or undefined.
 */
function NumberInput({ item, path, value }: ControlProps) {
  const form = useFormContext();
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder={item.placeholder}
      value={(value as string | number | undefined) ?? ""}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        form.setValue(path, digits === "" ? undefined : Number(digits), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
    />
  );
}

function SelectInput({ item, path }: ControlProps) {
  return (
    <SelectField name={path} placeholder={item.placeholder ?? "Select…"} options={useChoices(item)} />
  );
}

/**
 * Older drafts stored an option's display text rather than its id, so the stored
 * value is upgraded once — otherwise a restored draft shows nothing checked and
 * silently loses the answer on save.
 */
function MultiSelectInput({ item, path, value, label }: ControlProps) {
  const form = useFormContext();
  const options = useChoices(item);
  const resolved = coerceOptionValues(value, options);
  // Serialized so the effect compares by content, not by array identity.
  const resolvedKey = JSON.stringify(resolved);
  const storedKey = JSON.stringify(Array.isArray(value) ? value : []);

  useEffect(() => {
    if (resolvedKey !== "[]" && resolvedKey !== storedKey) {
      form.setValue(path, JSON.parse(resolvedKey) as string[], {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [resolvedKey, storedKey, form, path]);

  return (
    <CheckboxGroup
      value={resolved}
      onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
      options={options}
      aria-label={label}
    />
  );
}

/** Same legacy-value-to-id upgrade, for single-choice cards. */
function RadioCardsInput({ item, path, value, label }: ControlProps) {
  const form = useFormContext();
  const options = useChoices(item);
  const current = typeof value === "string" ? value : "";
  const resolved = coerceOptionValue(current, options);

  useEffect(() => {
    if (resolved && resolved !== current) {
      form.setValue(path, resolved, { shouldDirty: false, shouldValidate: false });
    }
  }, [resolved, current, form, path]);

  return (
    <RadioCardGroup
      value={resolved || undefined}
      onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
      options={options}
      aria-label={label}
    />
  );
}

function YesNoInput({ path, value, label }: ControlProps) {
  const form = useFormContext();
  return (
    <YesNo
      value={value as boolean | undefined}
      onChange={(v) => form.setValue(path, v, { shouldDirty: true, shouldValidate: true })}
      aria-label={label}
    />
  );
}

/**
 * Bucket, accepted types and size ceiling all come from the admin's validation
 * bag. The authoritative checks (extension, MIME, magic bytes, per-bucket
 * ceiling) run server-side in /api/upload.
 */
function FileInput({ item, path, value }: ControlProps) {
  const form = useFormContext();
  const v = item.validation ?? {};
  return (
    <FileUpload
      bucket={v.bucket ?? "logos"}
      fieldKey={item.fieldName}
      label={item.placeholder ?? "Upload file"}
      // The hint is rendered once by the Field wrapper; don't repeat it inside
      // the dropzone — the box keeps its default "Max NMB" line.
      accept={v.accept}
      maxSizeMB={v.maxSizeMB ?? 5}
      value={(value as string | undefined) || undefined}
      onChange={(url) => form.setValue(path, url ?? "", { shouldDirty: true })}
    />
  );
}

/** Explains a keystroke the sanitiser filtered out, in the error slot. */
function PhoneInput({ item, path, label, hint, error }: ControlProps) {
  const form = useFormContext();
  return (
    <PhoneField
      register={form.register(path)}
      label={label}
      hint={hint}
      required={item.required}
      error={error}
      placeholder={item.placeholder}
      maxLength={item.validation?.maxLength}
    />
  );
}

/** Reports an existing directory listing while the applicant types. */
function StartupNameInput({ item, path, value, label, hint, error }: ControlProps) {
  const form = useFormContext();
  return (
    <StartupNameField
      register={form.register(path)}
      label={label}
      hint={hint}
      required={item.required}
      error={error}
      placeholder={item.placeholder}
      maxLength={item.validation?.maxLength}
      initialValue={typeof value === "string" ? value : ""}
    />
  );
}

// ===========================================================================
// Groups
// ===========================================================================

function Group({ item, path }: { item: FormItem; path: string }) {
  if (item.repeatable) return <RepeatableGroup item={item} path={path} />;
  return (
    <fieldset className="space-y-5 rounded-xl border border-pasha-line bg-white p-5">
      {item.label && (
        <legend className="px-1 text-sm font-medium text-pasha-ink">{item.label}</legend>
      )}
      {item.hint && <p className="text-xs text-pasha-muted">{item.hint}</p>}
      {(item.children ?? []).map((child) => (
        <FormField key={child.id} item={child} namePrefix={path} />
      ))}
    </fieldset>
  );
}

function RepeatableGroup({ item, path }: { item: FormItem; path: string }) {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: path });
  const itemLabel = item.itemLabel ?? "item";
  const max = item.maxItems ?? Infinity;
  const min = item.minItems ?? 0;

  // Each child already knows its own empty value, so a new row is just those.
  const blankItem = () =>
    Object.fromEntries((item.children ?? []).map((c) => [c.fieldName, c.defaultValue]));

  return (
    <div className="space-y-4">
      {item.label && <h3 className="text-sm font-medium text-pasha-ink">{item.label}</h3>}
      {item.hint && <p className="text-xs text-pasha-muted -mt-2">{item.hint}</p>}
      {fields.map((row, idx) => (
        <div key={row.id} className="rounded-xl border border-pasha-line bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-pasha-ink">
              {itemLabel} #{idx + 1}
            </span>
            {fields.length > min && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red transition-colors px-2 py-1 rounded-md hover:bg-pasha-red/[0.04]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                Remove
              </button>
            )}
          </div>
          {(item.children ?? []).map((child) => (
            <FormField key={child.id} item={child} namePrefix={`${path}.${idx}`} />
          ))}
        </div>
      ))}
      {fields.length < max && (
        <button
          type="button"
          onClick={() => append(blankItem())}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-pasha-line bg-white px-4 py-2 text-sm text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Add {itemLabel}
        </button>
      )}
    </div>
  );
}
