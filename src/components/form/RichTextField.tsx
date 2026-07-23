"use client";

import dynamic from "next/dynamic";
import { useController, useFormContext } from "react-hook-form";

import { htmlToPlainText } from "@/lib/forms/form-config";
import { cn } from "@/lib/utils";

// CKEditor touches `window`, so load it client-only.
const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-32 w-full rounded-lg border border-pasha-line bg-pasha-stone/30 animate-pulse" />
  ),
});

// Default cap when a field doesn't configure its own maxLength — matches the
// short-form fields most rich-text inputs are used for.
const DEFAULT_MAX_LENGTH = 160;

// react-hook-form adapter around the shared CKEditor. Stores the field value as
// an HTML string; the live counter mirrors the schema, which measures the
// *visible text* length (htmlToPlainText), not the raw HTML.
export function RichTextField({
  name,
  maxLength = DEFAULT_MAX_LENGTH,
}: {
  name: string;
  maxLength?: number;
}) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  const html = typeof field.value === "string" ? field.value : "";
  const used = htmlToPlainText(html).length;
  const over = used > maxLength;

  return (
    <div>
      <RichTextEditor value={html} onChange={field.onChange} />
      <div
        className={cn(
          "mt-1.5 text-right text-xs tabular-nums transition-colors",
          over ? "text-pasha-red font-medium" : "text-pasha-muted"
        )}
        aria-live="polite"
      >
        {used} / {maxLength} characters
        {over ? ` — ${used - maxLength} over the limit` : ""}
      </div>
    </div>
  );
}
