"use client";

import dynamic from "next/dynamic";
import { useController, useFormContext } from "react-hook-form";

// CKEditor touches `window`, so load it client-only.
const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-32 w-full rounded-lg border border-pasha-line bg-pasha-stone/30 animate-pulse" />
  ),
});

// react-hook-form adapter around the shared CKEditor. Stores the field value as
export function RichTextField({ name }: { name: string }) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <RichTextEditor
      value={typeof field.value === "string" ? field.value : ""}
      onChange={field.onChange}
    />
  );
}
