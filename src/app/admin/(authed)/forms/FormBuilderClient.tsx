"use client";

import { useState, useMemo, useCallback, createContext, useContext } from "react";
import {
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { InputType, INPUT_TYPE_LABELS } from "@/lib/form-enums";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";

// Available option-list names (code + admin-managed DB lists), provided by the
// page and surfaced as a dropdown so admins can discover/pick them instead of
// typing a magic string that silently yields an empty field on a typo.
const OptionNamesContext = createContext<string[]>([]);

export type FormKey = "application" | "registration";

export type SectionRow = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  step: number;
  sort_order: number;
  is_active: boolean;
  form_key?: string | null;
};

export type FieldRow = {
  id: string;
  section_id: string;
  parent_field_id: string | null;
  field_key: string;
  label: string | null;
  hint: string | null;
  placeholder: string | null;
  input_type: number;
  required: boolean;
  validation: Record<string, unknown> | null;
  options: unknown;
  options_source: string | null;
  repeatable: boolean;
  min_items: number | null;
  max_items: number | null;
  item_label: string | null;
  column_map: string | null;
  visible: boolean;
  sort_order: number;
  conditional: { field_key: string; equals: unknown } | null;
};

const INPUT_TYPE_OPTIONS = Object.entries(INPUT_TYPE_LABELS).map(([v, label]) => ({
  value: Number(v),
  label,
}));

// Input types that need a list of choices.
const CHOICE_TYPES = new Set<number>([
  InputType.SELECT,
  InputType.MULTISELECT,
  InputType.RADIO_CARDS,
]);

// FILE_UPLOAD "accept" presets. `accept` is react-dropzone's MIME→extensions
// map; editing that raw JSON is admin-hostile, so we expose it as tick-boxes
// and store the merge of the chosen presets. Previously this was only settable
// by hand-writing the validation JSON via a SQL query.
const FILE_ACCEPT_PRESETS: {
  id: string;
  label: string;
  accept: Record<string, string[]>;
}[] = [
  { id: "pdf", label: "PDF", accept: { "application/pdf": [".pdf"] } },
  { id: "images", label: "Images (any)", accept: { "image/*": [] } },
  { id: "png", label: "PNG", accept: { "image/png": [".png"] } },
  { id: "jpeg", label: "JPG / JPEG", accept: { "image/jpeg": [".jpg", ".jpeg"] } },
  {
    id: "word",
    label: "Word (.doc / .docx)",
    accept: {
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  },
  {
    id: "excel",
    label: "Excel (.xls / .xlsx)",
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  },
  {
    id: "ppt",
    label: "PowerPoint (.ppt / .pptx)",
    accept: {
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    },
  },
  { id: "csv", label: "CSV", accept: { "text/csv": [".csv"] } },
];

// Buckets a file field can upload into (the Supabase storage bucket).
const FILE_BUCKETS = ["logos", "founder-photos", "pitch-decks"] as const;

// Which presets a stored accept map represents — a preset counts as selected
// when all of its MIME keys are present. Lets old query-seeded fields render
// their ticked boxes instead of looking empty.
function acceptToPresetIds(accept: unknown): string[] {
  if (!accept || typeof accept !== "object") return [];
  const keys = new Set(Object.keys(accept as Record<string, unknown>));
  return FILE_ACCEPT_PRESETS.filter((p) =>
    Object.keys(p.accept).every((k) => keys.has(k))
  ).map((p) => p.id);
}

// Merge the chosen presets back into one accept map (null = accept any file).
function presetIdsToAccept(ids: string[]): Record<string, string[]> | null {
  const chosen = FILE_ACCEPT_PRESETS.filter((p) => ids.includes(p.id));
  if (chosen.length === 0) return null;
  const out: Record<string, string[]> = {};
  for (const p of chosen) {
    for (const [mime, exts] of Object.entries(p.accept)) {
      out[mime] = Array.from(new Set([...(out[mime] ?? []), ...exts]));
    }
  }
  return out;
}

// Serialize a field's stored `options` into the textarea format: one option per
// line, `value | label` when they differ, otherwise just the value.
function optionsToText(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options
    .map((o) => {
      if (typeof o === "string") return o;
      if (o && typeof o === "object") {
        const value = String((o as { value?: unknown }).value ?? "");
        const label = (o as { label?: unknown }).label;
        const labelStr = label == null ? value : String(label);
        return labelStr === value ? value : `${value} | ${labelStr}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

// Parse the textarea back into a {value,label}[] array (or null when empty, so
// the field falls back to options_source / no options).
function textToOptions(text: string): { value: string; label: string }[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines.map((line) => {
    const idx = line.indexOf("|");
    if (idx === -1) return { value: line, label: line };
    const value = line.slice(0, idx).trim();
    const label = line.slice(idx + 1).trim();
    return { value, label: label || value };
  });
}

async function api(method: string, body: unknown) {
  const res = await fetch("/api/admin/forms", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm text-pasha-ink focus:outline-none focus:border-pasha-red";

export function FormBuilderClient({
  initialSections,
  initialFields,
  optionListNames = [],
}: {
  initialSections: SectionRow[];
  initialFields: FieldRow[];
  optionListNames?: string[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [fields, setFields] = useState(initialFields);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Which form is being edited. The same builder drives both the post-login
  // application form and the sign-up registration form (scoped by form_key).
  const [activeForm, setActiveForm] = useState<FormKey>("application");
  // The step just created via "Add step" — it mounts expanded; all others
  // start collapsed so the builder is compact on load.
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/forms");
    const data = await res.json();
    setSections(data.sections ?? []);
    setFields(data.fields ?? []);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<void>, okMsg?: string) => {
      setBusy(true);
      setMsg(null);
      try {
        await fn();
        if (okMsg) setMsg(okMsg);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const updateFieldLocal = (id: string, updates: Partial<FieldRow>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  const updateSectionLocal = (id: string, updates: Partial<SectionRow>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

  const saveField = (id: string, updates: Partial<FieldRow>) =>
    run(async () => {
      updateFieldLocal(id, updates);
      await api("PATCH", { type: "field", id, updates });
    }, "Saved");
  const saveSection = (id: string, updates: Partial<SectionRow>) =>
    run(async () => {
      updateSectionLocal(id, updates);
      await api("PATCH", { type: "section", id, updates });
    }, "Saved");

  // Sections belonging to the form currently being edited. Rows without a
  // form_key are legacy application sections (column added in 20260618).
  const visibleSections = useMemo(
    () => sections.filter((s) => (s.form_key ?? "application") === activeForm),
    [sections, activeForm]
  );

  const steps = useMemo(
    () => Array.from(new Set(visibleSections.map((s) => s.step))).sort((a, b) => a - b),
    [visibleSections]
  );

  // Each section IS a step. "Add step" appends a new section at step = max+1
  // within the active form, then scrolls the freshly-created card into view.
  const addStep = () =>
    run(async () => {
      const nextStep = (steps[steps.length - 1] ?? 0) + 1;
      const { id } = await api("POST", {
        type: "section",
        data: {
          key: `section_${Date.now()}`,
          title: "New step",
          step: nextStep,
          sort_order: nextStep,
          is_active: true,
          form_key: activeForm,
        },
      });
      if (id) setJustAddedId(id);
      await refresh();
      if (id && typeof window !== "undefined") {
        // Wait for the new card to render, then bring it into view.
        requestAnimationFrame(() =>
          document
            .getElementById(`step-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    });

  // Reorder a step by swapping its `step` with the neighbour in `dir`
  // (within the active form only).
  const moveStep = (sectionId: string, dir: -1 | 1) =>
    run(async () => {
      const ordered = [...visibleSections].sort((a, b) => a.step - b.step);
      const i = ordered.findIndex((s) => s.id === sectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      const a = ordered[i];
      const b = ordered[j];
      await api("PATCH", { type: "section", id: a.id, updates: { step: b.step } });
      await api("PATCH", { type: "section", id: b.id, updates: { step: a.step } });
      await refresh();
    });

  type FieldKind = "field" | "group" | "heading";
  const addField = (sectionId: string, parentFieldId: string | null, kind: FieldKind) =>
    run(async () => {
      const siblings = fields.filter(
        (f) => f.section_id === sectionId && f.parent_field_id === parentFieldId
      );
      const input_type =
        kind === "group" ? InputType.GROUP : kind === "heading" ? InputType.HEADING : InputType.TEXT;
      await api("POST", {
        type: "field",
        data: {
          section_id: sectionId,
          parent_field_id: parentFieldId,
          field_key: `field_${Date.now()}`,
          label: kind === "group" ? "New subsection" : kind === "heading" ? "New heading" : "New field",
          input_type,
          required: false,
          validation: {},
          sort_order: siblings.length,
          visible: true,
          repeatable: false,
          column_map: null,
        },
      });
      await refresh();
    });

  const deleteSection = (id: string) =>
    run(async () => {
      if (!confirm("Delete this section and all its fields?")) return;
      await api("DELETE", { type: "section", id });
      await refresh();
    });

  const deleteField = (id: string) =>
    run(async () => {
      const f = fields.find((x) => x.id === id);
      if (f?.column_map && !confirm(`This field is mapped to submissions.${f.column_map}. Deleting it stops new submissions from populating that column. Continue?`)) {
        return;
      }
      const json = await api("DELETE", { type: "field", id });
      await refresh();
      if (json.warning) setMsg(json.warning);
    });

  return (
    <OptionNamesContext.Provider value={optionListNames}>
    <div className="space-y-8">
      {/* Form switcher — the same builder edits both forms. */}
      <div className="inline-flex rounded-lg border border-pasha-line bg-white p-1 text-sm">
        {([
          ["application", "Application form"],
          ["registration", "Registration form"],
        ] as [FormKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveForm(key)}
            className={
              "rounded-md px-3 py-1.5 transition-colors " +
              (activeForm === key
                ? "bg-pasha-ink text-white"
                : "text-pasha-muted hover:text-pasha-ink")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {activeForm === "registration" ? (
        <p className="text-xs text-pasha-muted -mt-4 max-w-2xl">
          These fields appear on the sign-up page after the email &amp; password
          step. Email and password are always collected and aren&apos;t shown here.
          Field keys that match the application form (e.g. <span className="font-mono">startup_name</span>,{" "}
          <span className="font-mono">stage</span>) prefill the applicant&apos;s
          full application after they sign in.
        </p>
      ) : (
        <p className="text-xs text-pasha-muted -mt-4 max-w-2xl">
          The post-login application form. Fields mapped to a database column feed
          vetting and the public directory.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addStep}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-pasha-ink px-4 py-2 text-sm text-white hover:bg-pasha-red transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add step
        </button>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-pasha-muted" />}
        {msg && <span className="text-sm text-pasha-muted">{msg}</span>}
      </div>

      {visibleSections.length === 0 && (
        <p className="rounded-lg border border-dashed border-pasha-line bg-pasha-stone/30 px-4 py-6 text-center text-sm text-pasha-muted">
          No steps yet for this form. Click <strong>Add step</strong> to create one.
        </p>
      )}

      {[...visibleSections]
        .sort((a, b) => a.step - b.step)
        .map((section, idx, arr) => (
          <SectionCard
            key={section.id}
            section={section}
            stepNumber={idx + 1}
            isFirst={idx === 0}
            isLast={idx === arr.length - 1}
            defaultExpanded={section.id === justAddedId}
            fields={fields}
            busy={busy}
            onSaveSection={saveSection}
            onDeleteSection={deleteSection}
            onMoveStep={moveStep}
            onAddField={addField}
            onSaveField={saveField}
            onDeleteField={deleteField}
          />
        ))}
    </div>
    </OptionNamesContext.Provider>
  );
}

type FieldKind = "field" | "group" | "heading";

function SectionCard({
  section,
  stepNumber,
  isFirst,
  isLast,
  defaultExpanded,
  fields,
  busy,
  onSaveSection,
  onDeleteSection,
  onMoveStep,
  onAddField,
  onSaveField,
  onDeleteField,
}: {
  section: SectionRow;
  stepNumber: number;
  isFirst: boolean;
  isLast: boolean;
  defaultExpanded: boolean;
  fields: FieldRow[];
  busy: boolean;
  onSaveSection: (id: string, u: Partial<SectionRow>) => void;
  onDeleteSection: (id: string) => void;
  onMoveStep: (id: string, dir: -1 | 1) => void;
  onAddField: (sectionId: string, parentId: string | null, kind: FieldKind) => void;
  onSaveField: (id: string, u: Partial<FieldRow>) => void;
  onDeleteField: (id: string) => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const topFields = fields
    .filter((f) => f.section_id === section.id && f.parent_field_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);
  const fieldCount = fields.filter((f) => f.section_id === section.id).length;

  return (
    <div id={`step-${section.id}`} className="rounded-xl border border-pasha-line bg-white p-5 space-y-4 scroll-mt-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 items-center gap-2 text-left group"
          title={collapsed ? "Expand step" : "Collapse step"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0 text-pasha-muted group-hover:text-pasha-red" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0 text-pasha-muted group-hover:text-pasha-red" />
          )}
          <h2 className="font-mono text-xs uppercase tracking-[2px] text-pasha-red font-semibold truncate">
            Step {stepNumber} — {section.title}
          </h2>
          {collapsed && (
            <span className="text-[11px] text-pasha-muted normal-case tracking-normal font-normal">
              ({fieldCount} field{fieldCount === 1 ? "" : "s"}
              {section.is_active ? "" : " · hidden"})
            </span>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={busy || isFirst}
            onClick={() => onMoveStep(section.id, -1)}
            title="Move step up"
            className="rounded-md border border-pasha-line p-1.5 text-pasha-muted hover:text-pasha-red disabled:opacity-30"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={busy || isLast}
            onClick={() => onMoveStep(section.id, 1)}
            title="Move step down"
            className="rounded-md border border-pasha-line p-1.5 text-pasha-muted hover:text-pasha-red disabled:opacity-30"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-pasha-muted">
          Step title
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex-1 text-xs text-pasha-muted">
          Subtitle
          <input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <label className="text-xs text-pasha-muted">
          Active
          <SelectMenu
            className="w-full"
            value={section.is_active ? "1" : "0"}
            onValueChange={(v) => onSaveSection(section.id, { is_active: v === "1" })}
            options={[{ value: "1", label: "Yes" }, { value: "0", label: "No" }]}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSaveSection(section.id, { title, subtitle })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm hover:border-pasha-red hover:text-pasha-red"
        >
          <Save className="w-4 h-4" /> Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeleteSection(section.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line px-3 py-2 text-sm text-pasha-muted hover:border-pasha-red hover:text-pasha-red"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 pl-3 border-l-2 border-pasha-line/60">
        {topFields.map((field) => (
          <FieldNode
            key={field.id}
            field={field}
            fields={fields}
            busy={busy}
            onAddField={onAddField}
            onSaveField={onSaveField}
            onDeleteField={onDeleteField}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAddField(section.id, null, "field")}
          className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red"
        >
          <Plus className="w-3.5 h-3.5" /> Add field
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAddField(section.id, null, "heading")}
          className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red"
        >
          <Plus className="w-3.5 h-3.5" /> Add heading
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAddField(section.id, null, "group")}
          className="inline-flex items-center gap-1.5 text-xs text-pasha-muted hover:text-pasha-red"
        >
          <Plus className="w-3.5 h-3.5" /> Add subsection
        </button>
      </div>
        </>
      )}
    </div>
  );
}

function FieldNode({
  field,
  fields,
  busy,
  onAddField,
  onSaveField,
  onDeleteField,
}: {
  field: FieldRow;
  fields: FieldRow[];
  busy: boolean;
  onAddField: (sectionId: string, parentId: string | null, kind: FieldKind) => void;
  onSaveField: (id: string, u: Partial<FieldRow>) => void;
  onDeleteField: (id: string) => void;
}) {
  const [draft, setDraft] = useState({
    field_key: field.field_key,
    label: field.label ?? "",
    placeholder: field.placeholder ?? "",
    hint: field.hint ?? "",
    options_source: field.options_source ?? "",
    options: optionsToText(field.options),
    minLength: (field.validation?.minLength as number | undefined) ?? "",
    maxLength: (field.validation?.maxLength as number | undefined) ?? "",
    pattern: (field.validation?.pattern as string | undefined) ?? "",
    acceptIds: acceptToPresetIds(field.validation?.accept),
    bucket: (field.validation?.bucket as string | undefined) ?? "",
    fileMaxSizeMB:
      field.validation?.maxSizeMB == null ? "" : String(field.validation.maxSizeMB),
  });
  const isGroup = field.input_type === InputType.GROUP;
  const isHeadingField = field.input_type === InputType.HEADING;
  const isChoice = CHOICE_TYPES.has(field.input_type);
  const isFile = field.input_type === InputType.FILE_UPLOAD;
  // Field edits change the live application form, so the explicit "Save" button
  // routes through a confirmation modal. `pendingSave` holds the action to run
  // once the admin confirms.
  const [pendingSave, setPendingSave] = useState<(() => void) | null>(null);
  const confirmModal = (
    <ConfirmDeleteModal
      open={pendingSave !== null}
      title="Save field changes?"
      description="This updates the field on the live application form and may affect new submissions."
      confirmLabel="Save changes"
      busy={busy}
      onConfirm={() => {
        pendingSave?.();
        setPendingSave(null);
      }}
      onCancel={() => setPendingSave(null)}
    />
  );
  const optionListNames = useContext(OptionNamesContext);
  // Show the saved source even if it's not in the available list (e.g. a list
  // that was later deleted) so the admin can see/fix it.
  const listNames =
    field.options_source && !optionListNames.includes(field.options_source)
      ? [...optionListNames, field.options_source]
      : optionListNames;
  const children = fields
    .filter((f) => f.parent_field_id === field.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const typeSelect = (
    <label className="text-[11px] text-pasha-muted">
      Type
      <SelectMenu
        className="w-full"
        value={String(field.input_type)}
        onValueChange={(v) => onSaveField(field.id, { input_type: Number(v) })}
        options={INPUT_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
      />
    </label>
  );

  // HEADING — only a label matters; show a slim editor.
  if (isHeadingField) {
    return (
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-pasha-line/80 bg-white px-3 py-2">
        <span className="text-[10px] font-mono uppercase tracking-[2px] text-pasha-red font-semibold self-center">
          Heading
        </span>
        <label className="text-[11px] text-pasha-muted flex-1">
          Label
          <input
            className={inputCls}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </label>
        {typeSelect}
        <button
          type="button"
          disabled={busy}
          onClick={() => setPendingSave(() => () => onSaveField(field.id, { label: draft.label }))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-2 text-xs hover:border-pasha-red hover:text-pasha-red"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeleteField(field.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-2 text-xs text-pasha-muted hover:border-pasha-red hover:text-pasha-red"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {confirmModal}
      </div>
    );
  }

  const save = () =>
    onSaveField(field.id, {
      field_key: draft.field_key,
      label: draft.label,
      placeholder: draft.placeholder || null,
      hint: draft.hint || null,
      options_source: draft.options_source || null,
      options: isChoice ? textToOptions(draft.options) : field.options ?? null,
      validation: {
        ...(field.validation ?? {}),
        minLength: draft.minLength === "" ? undefined : Number(draft.minLength),
        maxLength: draft.maxLength === "" ? undefined : Number(draft.maxLength),
        pattern: draft.pattern || undefined,
        // FILE_UPLOAD-only: allowed file types, storage bucket and size cap.
        // `?? undefined` drops the key from the JSON so it's cleared when unset.
        ...(isFile
          ? {
              accept: presetIdsToAccept(draft.acceptIds) ?? undefined,
              bucket: draft.bucket || undefined,
              maxSizeMB:
                draft.fileMaxSizeMB === "" ? undefined : Number(draft.fileMaxSizeMB),
            }
          : {}),
      },
    });

  return (
    <div className="rounded-lg border border-pasha-line/80 bg-pasha-stone/20 p-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-pasha-muted">
          Label
          <input
            className={inputCls + " min-w-[160px]"}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-pasha-muted">
          Key
          <input
            className={inputCls + " min-w-[120px] font-mono"}
            value={draft.field_key}
            onChange={(e) => setDraft({ ...draft, field_key: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-pasha-muted">
          Type
          <SelectMenu
            className="w-full"
            value={String(field.input_type)}
            onValueChange={(v) => onSaveField(field.id, { input_type: Number(v) })}
            options={INPUT_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          />
        </label>
        <label className="ml-auto text-[11px] text-pasha-muted flex flex-col items-center">
          Required
          <input
            type="checkbox"
            className="mt-2 h-5 w-5 accent-pasha-red"
            checked={field.required}
            onChange={(e) => onSaveField(field.id, { required: e.target.checked })}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPendingSave(() => save)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-2 text-xs hover:border-pasha-red hover:text-pasha-red"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeleteField(field.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-2 text-xs text-pasha-muted hover:border-pasha-red hover:text-pasha-red"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-pasha-muted">
          Placeholder
          <input
            className={inputCls + " min-w-[140px]"}
            value={draft.placeholder}
            onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-pasha-muted">
          Min len
          <input
            className={inputCls + " w-20"}
            value={draft.minLength}
            onChange={(e) => setDraft({ ...draft, minLength: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-pasha-muted">
          Max len
          <input
            className={inputCls + " w-20"}
            value={draft.maxLength}
            onChange={(e) => setDraft({ ...draft, maxLength: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-pasha-muted">
          Pattern
          <input
            className={inputCls + " min-w-[120px] font-mono"}
            value={draft.pattern}
            onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
          />
        </label>
      </div>

      {isChoice && (
        <div className="rounded-md border border-pasha-line/70 bg-white p-2.5 space-y-2.5">
          <p className="text-[11px] text-pasha-muted">
            This field needs a list of choices. Pick a <strong>built-in list</strong>{" "}
            or type your <strong>own options</strong> below.
          </p>

          <label className="text-[11px] text-pasha-muted block">
            Built-in list
            <SelectMenu
              className="mt-1 w-full"
              value={draft.options_source || "__custom__"}
              onValueChange={(v) =>
                setDraft({ ...draft, options_source: v === "__custom__" ? "" : v })
              }
              options={[
                { value: "__custom__", label: "— Custom (use the box below) —" },
                ...listNames.map((name) => ({ value: name, label: name })),
              ]}
            />
          </label>

          <label className="text-[11px] text-pasha-muted block">
            Custom options — one per line. Use{" "}
            <span className="font-mono">value | label</span> to store a code but show
            friendlier text (otherwise the line is used as both).
            <textarea
              className={inputCls + " mt-1 font-mono min-h-[96px]"}
              placeholder={"Karachi\nLahore\nb2b | Business to Business (B2B)"}
              value={draft.options}
              onChange={(e) => setDraft({ ...draft, options: e.target.value })}
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-pasha-muted">
              If both are set, your custom options win. Inline options aren&apos;t
              saved until you click Save.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendingSave(() => save)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-1.5 text-xs hover:border-pasha-red hover:text-pasha-red shrink-0"
            >
              <Save className="w-3.5 h-3.5" /> Save options
            </button>
          </div>
        </div>
      )}

      {isFile && (
        <div className="rounded-md border border-pasha-line/70 bg-white p-2.5 space-y-2.5">
          <p className="text-[11px] text-pasha-muted">
            <strong>File upload settings.</strong> Tick the file types applicants
            may upload. Leave all unticked to accept any file.
          </p>

          <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5">
            {FILE_ACCEPT_PRESETS.map((p) => {
              const checked = draft.acceptIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-1.5 text-[11px] text-pasha-ink"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-pasha-red"
                    checked={checked}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        acceptIds: e.target.checked
                          ? [...draft.acceptIds, p.id]
                          : draft.acceptIds.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.label}
                </label>
              );
            })}
          </fieldset>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-pasha-muted">
              Storage bucket
              <SelectMenu
                className="mt-1 w-full min-w-[150px]"
                value={draft.bucket || "logos"}
                onValueChange={(v) => setDraft({ ...draft, bucket: v })}
                options={FILE_BUCKETS.map((b) => ({ value: b, label: b }))}
              />
            </label>
            <label className="text-[11px] text-pasha-muted">
              Max size (MB)
              <input
                className={inputCls + " w-24"}
                inputMode="numeric"
                placeholder="5"
                value={draft.fileMaxSizeMB}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fileMaxSizeMB: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendingSave(() => save)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-2.5 py-2 text-xs hover:border-pasha-red hover:text-pasha-red"
            >
              <Save className="w-3.5 h-3.5" /> Save file settings
            </button>
          </div>
        </div>
      )}

      {field.column_map && (
        <p className="text-[11px] text-amber-600">
          <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5 shrink-0" />
          Mapped to <span className="font-mono break-all">submissions.{field.column_map}</span> — used by vetting / the public directory.
        </p>
      )}

      {isGroup && (
        <div className="mt-1 space-y-2 rounded-md border border-pasha-line/70 bg-white p-2.5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-pasha-muted flex flex-col">
              Repeatable
              <input
                type="checkbox"
                className="mt-2 h-5 w-5 accent-pasha-red"
                checked={field.repeatable}
                onChange={(e) => onSaveField(field.id, { repeatable: e.target.checked })}
              />
            </label>
            <label className="text-[11px] text-pasha-muted">
              Min items
              <input
                className={inputCls + " w-20"}
                defaultValue={field.min_items ?? ""}
                onBlur={(e) =>
                  onSaveField(field.id, { min_items: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </label>
            <label className="text-[11px] text-pasha-muted">
              Max items
              <input
                className={inputCls + " w-20"}
                defaultValue={field.max_items ?? ""}
                onBlur={(e) =>
                  onSaveField(field.id, { max_items: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </label>
            <label className="text-[11px] text-pasha-muted">
              Item label
              <input
                className={inputCls + " min-w-[100px]"}
                defaultValue={field.item_label ?? ""}
                onBlur={(e) => onSaveField(field.id, { item_label: e.target.value || null })}
              />
            </label>
          </div>

          <div className="space-y-2 pl-3 border-l-2 border-pasha-line/60">
            {children.map((child) => (
              <FieldNode
                key={child.id}
                field={child}
                fields={fields}
                busy={busy}
                onAddField={onAddField}
                onSaveField={onSaveField}
                onDeleteField={onDeleteField}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onAddField(field.section_id, field.id, "field")}
              className="inline-flex items-center gap-1.5 text-[11px] text-pasha-muted hover:text-pasha-red"
            >
              <Plus className="w-3 h-3" /> Add child field
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAddField(field.section_id, field.id, "group")}
              className="inline-flex items-center gap-1.5 text-[11px] text-pasha-muted hover:text-pasha-red"
            >
              <Plus className="w-3 h-3" /> Add nested subsection
            </button>
          </div>
        </div>
      )}
      {confirmModal}
    </div>
  );
}
