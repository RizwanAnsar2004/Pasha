"use client";

// Shared WYSIWYG editor (CKEditor 5). Loaded client-only via next/dynamic by
// its callers. GeneralHtmlSupport allows arbitrary elements/attributes/styles
// so content round-trips without being stripped, and SourceEditing exposes the
// raw HTML. Used by the email-template editor and the dynamic form RICH_TEXT
// field.

import { CKEditor } from "@ckeditor/ckeditor5-react";
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

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  return (
    <div className="ck-rich-text">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          // Self-hosted open-source build.
          licenseKey: "GPL",
          plugins: [
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
            SourceEditing,
            GeneralHtmlSupport,
          ],
          toolbar: [
            "sourceEditing",
            "|",
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
          ],
          // Let arbitrary HTML through (email markup, inline styles).
          htmlSupport: {
            allow: [{ name: /.*/, attributes: true, classes: true, styles: true }],
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
        }}
        onChange={(_event, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
