"use client";

// WYSIWYG email-body editor (CKEditor 5). Loaded client-only via next/dynamic
// from EmailTemplatesClient. GeneralHtmlSupport is configured to allow ANY
// element/attribute/style so email HTML (inline styles, etc.) round-trips
// without being stripped, and SourceEditing exposes the raw HTML when needed.

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
    <div className="ck-email-editor">
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
