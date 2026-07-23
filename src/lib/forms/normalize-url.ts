import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

// Most "Must be a valid http or https URL" reports are just a missing scheme —
// applicants type "github.com/name" or "www.site.pk". Prefix https:// rather
// than rejecting it.
//
// Left alone: empty values, anything that already has a scheme (including
// mailto:/tel:, which the safe-URL rule rejects on purpose — silently rewriting
// those to https would hide a real mistake), and protocol-relative "//host".
export function normalizeUrlValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

// Drop-in replacement for form.register() on a URL field: same props, but blur
// normalizes the value first. RHF's own onBlur is chained, not replaced — it
// drives touched state and `mode: "onTouched"` validation.
export function urlRegister<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>
) {
  const reg = form.register(name);
  return {
    ...reg,
    onBlur: async (event: React.FocusEvent<HTMLInputElement>) => {
      const current = form.getValues(name);
      if (typeof current === "string") {
        const next = normalizeUrlValue(current);
        if (next !== current) {
          form.setValue(name, next as never, { shouldDirty: true });
        }
      }
      await reg.onBlur(event);
    },
  };
}
