"use client";

// Shared WYSIWYG editor (CKEditor 5).

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

// Put each tag boundary on its own line so minified email HTML is readable in the HTML tab.
function prettyHtml(html: string): string {
  return html.replace(/>\s*</g, ">\n<");
}

type OnChangeRef = { current: (html: string) => void };

// Isolated CKEditor that behaves as an UNCONTROLLED input.
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
      // While SourceEditing is active, CKEditor keeps raw-HTML edits in its own <textarea> and does NOT sync them into the model until source mode is.
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
  (prev, next) => prev.withSourceButton === next.withSourceButton
);

export default function RichTextEditor({
  value,
  onChange,
  sourceTabs = false,
}: {
  value: string;
  onChange: (html: string) => void;
  // When true, show explicit Visual / HTML tabs instead of the inline Source button.
  sourceTabs?: boolean;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  // Read synchronously inside CKEditor's onChange so the hidden visual editor can't overwrite the value while the user is typing in the HTML textarea.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Bumped whenever we want the (memoized) visual editor to reload the current value — i.e.
  const [visualSeed, setVisualSeed] = useState(0);

  // Stable ref objects so the memoized CkEditor never re-renders, while still calling the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const visualOnChangeRef = useRef<(html: string) => void>(() => {});
  visualOnChangeRef.current = (html) => {
    if (modeRef.current === "visual") onChange(html);
  };

  // Guard against being rendered inside a <label> (e.g.
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

      {/* Both editors stay mounted; we toggle visibility. The visual editor only */}
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
