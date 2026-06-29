"use client";

// Shared WYSIWYG editor (CKEditor 5). Loaded client-only via next/dynamic by
// its callers. GeneralHtmlSupport allows arbitrary elements/attributes/styles
// so content round-trips without being stripped.
//
// Two layouts:
//   - default            → single CKEditor with an inline "Source" toolbar toggle
//                          (used by the dynamic form RICH_TEXT field).
//   - sourceTabs={true}   → explicit "Visual" / "HTML" tabs. Both editors stay
//                          mounted (we just show/hide them) so switching never
//                          remounts/resets, and the hidden one is prevented from
//                          emitting changes. Used by the email-template editor.

import { memo, useMemo, useRef, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import type { EditorConfig } from "ckeditor5";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  SourceEditing,
  GeneralHtmlSupport,
  Alignment,
  HorizontalLine,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { cn } from "@/lib/utils";

const BASE_PLUGINS = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  Alignment,
  HorizontalLine,
  GeneralHtmlSupport,
];

const BASE_TOOLBAR = [
  "heading",
  "|",
  "bold",
  "italic",
  "underline",
  "link",
  "|",
  "bulletedList",
  "numberedList",
  "blockQuote",
  "alignment",
  "insertTable",
  "horizontalLine",
  "|",
  "undo",
  "redo",
];

// Put each tag boundary on its own line so minified email HTML is readable in
// the HTML tab. Whitespace between block tags is ignored by email clients, so
// this is purely cosmetic. Inline runs like <strong>x</strong> stay intact
// because there's no ">​<" between the text and its tags.
function prettyHtml(html: string): string {
  return html.replace(/>\s*</g, ">\n<");
}

type OnChangeRef = { current: (html: string) => void };

// Isolated CKEditor that behaves as an UNCONTROLLED input.
//
// The trap: the @ckeditor/ckeditor5-react wrapper, on every render, compares its
// `data` prop against `editor.getData()` and calls `editor.setData()` when they
// differ. CKEditor normalizes HTML on load, so `data` (our stored string) and
// `getData()` (the normalized model) differ immediately — and after the first
// keystroke they ALWAYS differ. With a `data` prop present, that means any
// re-render snaps the content back and typed characters "appear then vanish".
//
// The fix is to never pass `data` at all. We seed the editor exactly once in
// `onReady` and from then on only read changes OUT via `onChange`. With no
// `data` prop there is nothing to revert to, so editing can never be clobbered.
// External re-seeding (switching templates, returning from the HTML tab) is done
// by changing the component `key`, which remounts and re-runs `onReady`. The memo
// is now just a perf optimization, not load-bearing for correctness.
const CkEditor = memo(
  function CkEditor({
    value,
    onChangeRef,
    withSourceButton,
  }: {
    value: string;
    onChangeRef: OnChangeRef;
    withSourceButton: boolean;
  }) {
    // Captured once at mount; used only to seed the editor in onReady.
    const seedRef = useRef(value);
    const config = useMemo<EditorConfig>(
      () => ({
        licenseKey: "GPL",
        plugins: withSourceButton ? [...BASE_PLUGINS, SourceEditing] : BASE_PLUGINS,
        toolbar: withSourceButton ? ["sourceEditing", "|", ...BASE_TOOLBAR] : BASE_TOOLBAR,
        htmlSupport: {
          allow: [{ name: /.*/, attributes: true, classes: true, styles: true }],
        },
        table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
      }),
      [withSourceButton]
    );
    return (
      // While SourceEditing is active, CKEditor keeps raw-HTML edits in its own
      // <textarea> and does NOT sync them into the model until source mode is
      // toggled off. Capture the textarea's input directly so the form value
      // stays current even if the user saves without leaving source mode.
      <div
        className="ck-rich-text"
        onInput={(e) => {
          const target = e.target;
          if (target instanceof HTMLTextAreaElement) onChangeRef.current(target.value);
        }}
      >
        <CKEditor
          editor={ClassicEditor}
          config={config}
          // Seed once — no `data` prop, so the wrapper never reverts our edits.
          onReady={(editor) => {
            if (seedRef.current) editor.setData(seedRef.current);
          }}
          onChange={(_event, editor) => onChangeRef.current(editor.getData())}
        />
      </div>
    );
  },
  // Editing is uncontrolled, so value/handler changes never need a re-render.
  // Re-seeding goes through a key-based remount instead.
  (prev, next) => prev.withSourceButton === next.withSourceButton
);

export default function RichTextEditor({
  value,
  onChange,
  sourceTabs = false,
}: {
  value: string;
  onChange: (html: string) => void;
  /** When true, show explicit Visual / HTML tabs instead of the inline Source button. */
  sourceTabs?: boolean;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  // Read synchronously inside CKEditor's onChange so the hidden visual editor
  // can't overwrite the value while the user is typing in the HTML textarea.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Bumped whenever we want the (memoized) visual editor to reload the current
  // value — i.e. when returning from the HTML tab after raw edits.
  const [visualSeed, setVisualSeed] = useState(0);

  // Stable ref objects so the memoized CkEditor never re-renders, while still
  // calling the latest onChange. (Updated every render with the current props.)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const visualOnChangeRef = useRef<(html: string) => void>(() => {});
  visualOnChangeRef.current = (html) => {
    if (modeRef.current === "visual") onChange(html);
  };

  // Guard against being rendered inside a <label> (e.g. a field wrapper). A
  // <label> forwards any click within it to its first labelable control — which,
  // for this editor, is one of CKEditor's toolbar buttons or our Visual/HTML
  // tabs. That stray synthetic click toggles modes / remounts CKEditor and steals
  // focus, so every click in the editable "bounces" out and typing is impossible.
  // Cancelling the click's default action for non-button targets suppresses the
  // forwarding while leaving real button clicks and CKEditor's own (listener-
  // based) handling untouched.
  const stopLabelHijack = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("button")) e.preventDefault();
  };

  if (!sourceTabs) {
    return (
      <div onClick={stopLabelHijack}>
        <CkEditor value={value} onChangeRef={onChangeRef} withSourceButton />
      </div>
    );
  }

  const showVisual = () => {
    setVisualSeed((n) => n + 1); // re-seed CKEditor with any HTML-tab edits
    setMode("visual");
  };

  const showHtml = () => {
    // Beautify once on entry so a minified body is readable.
    if (/>\s*</.test(value)) onChange(prettyHtml(value));
    setMode("html");
  };

  return (
    <div className="rounded-lg border border-pasha-line overflow-hidden" onClick={stopLabelHijack}>
      <div className="flex items-center gap-1 border-b border-pasha-line bg-pasha-stone/40 px-2 py-1.5">
        <button
          type="button"
          onClick={showVisual}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            mode === "visual" ? "bg-white text-pasha-ink shadow-sm" : "text-pasha-muted hover:text-pasha-ink"
          )}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={showHtml}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            mode === "html" ? "bg-white text-pasha-ink shadow-sm" : "text-pasha-muted hover:text-pasha-ink"
          )}
        >
          HTML
        </button>
      </div>

      {/* Both editors stay mounted; we toggle visibility. The visual editor only
          propagates changes when it's the active tab (modeRef guard), so typing
          in the HTML textarea is never clobbered by CKEditor re-normalizing. */}
      <div style={{ display: mode === "visual" ? "block" : "none" }}>
        <CkEditor
          key={visualSeed}
          value={value}
          onChangeRef={visualOnChangeRef}
          withSourceButton={false}
        />
      </div>
      <div style={{ display: mode === "html" ? "block" : "none" }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[360px] resize-y bg-white p-3 font-mono text-xs leading-relaxed text-pasha-ink focus:outline-none"
          placeholder="<p>Paste or edit raw HTML here…</p>"
        />
      </div>
    </div>
  );
}
