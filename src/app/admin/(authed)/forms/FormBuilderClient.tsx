"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Save, AlertTriangle, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { InputType, INPUT_TYPE_LABELS } from "@/lib/form-enums";

export type SectionRow = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  step: number;
  sort_order: number;
  is_active: boolean;
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
}: {
  initialSections: SectionRow[];
  initialFields: FieldRow[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [fields, setFields] = useState(initialFields);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  const steps = useMemo(
    () => Array.from(new Set(sections.map((s) => s.step))).sort((a, b) => a - b),
    [sections]
  );

  // Each section IS a step. "Add step" appends a new section at step = max+1.
  const addStep = () =>
    run(async () => {
      const nextStep = (steps[steps.length - 1] ?? 0) + 1;
      await api("POST", {
        type: "section",
        data: {
          key: `section_${Date.now()}`,
          title: "New step",
          step: nextStep,
          sort_order: nextStep,
          is_active: true,
        },
      });
      await refresh();
    });

  // Reorder a step by swapping its `step` with the neighbour in `dir`.
  const moveStep = (sectionId: string, dir: -1 | 1) =>
    run(async () => {
      const ordered = [...sections].sort((a, b) => a.step - b.step);
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
    <div className="space-y-8">
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

      {[...sections]
        .sort((a, b) => a.step - b.step)
        .map((section, idx, arr) => (
          <SectionCard
            key={section.id}
            section={section}
            stepNumber={idx + 1}
            isFirst={idx === 0}
            isLast={idx === arr.length - 1}
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
  );
}

type FieldKind = "field" | "group" | "heading";

function SectionCard({
  section,
  stepNumber,
  isFirst,
  isLast,
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
  const topFields = fields
    .filter((f) => f.section_id === section.id && f.parent_field_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="rounded-xl border border-pasha-line bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[2px] text-pasha-red font-semibold">
          Step {stepNumber} — {section.title}
        </h2>
        <div className="flex items-center gap-1">
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
          <select
            className={inputCls}
            value={section.is_active ? "1" : "0"}
            onChange={(e) => onSaveSection(section.id, { is_active: e.target.value === "1" })}
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
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
    minLength: (field.validation?.minLength as number | undefined) ?? "",
    maxLength: (field.validation?.maxLength as number | undefined) ?? "",
    pattern: (field.validation?.pattern as string | undefined) ?? "",
  });
  const isGroup = field.input_type === InputType.GROUP;
  const isHeadingField = field.input_type === InputType.HEADING;
  const children = fields
    .filter((f) => f.parent_field_id === field.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const typeSelect = (
    <label className="text-[11px] text-pasha-muted">
      Type
      <select
        className={inputCls}
        value={field.input_type}
        onChange={(e) => onSaveField(field.id, { input_type: Number(e.target.value) })}
      >
        {INPUT_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
          onClick={() => onSaveField(field.id, { label: draft.label })}
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
    );
  }

  const save = () =>
    onSaveField(field.id, {
      field_key: draft.field_key,
      label: draft.label,
      placeholder: draft.placeholder || null,
      hint: draft.hint || null,
      options_source: draft.options_source || null,
      validation: {
        ...(field.validation ?? {}),
        minLength: draft.minLength === "" ? undefined : Number(draft.minLength),
        maxLength: draft.maxLength === "" ? undefined : Number(draft.maxLength),
        pattern: draft.pattern || undefined,
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
          <select
            className={inputCls}
            value={field.input_type}
            onChange={(e) => onSaveField(field.id, { input_type: Number(e.target.value) })}
          >
            {INPUT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-pasha-muted flex flex-col">
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
          onClick={save}
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
          Options list
          <input
            className={inputCls + " min-w-[120px]"}
            placeholder="e.g. SECTORS"
            value={draft.options_source}
            onChange={(e) => setDraft({ ...draft, options_source: e.target.value })}
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

      {field.column_map && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          Mapped to <span className="font-mono">submissions.{field.column_map}</span> — used by vetting / the public directory.
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
    </div>
  );
}
