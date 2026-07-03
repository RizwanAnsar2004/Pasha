"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { Check, Eye, Loader2, Save } from "lucide-react";
import { RichText } from "@/components/ui/RichText";
import type { SiteContentSlug } from "@/lib/site-content";

// CKEditor touches `window` at import time → load client-only.
const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="text-sm text-pasha-muted px-1 py-3">Loading editor…</div>,
});

type Initial = { title: string; body: string; updated_at: string | null };

export function PrivacyContentClient({
  slug,
  meta,
  initial,
}: {
  slug: SiteContentSlug;
  meta: { label: string; description: string };
  initial: Initial;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [updatedAt, setUpdatedAt] = useState(initial.updated_at);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, body }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to save");
      }
      const data = (await res.json()) as Initial;
      setUpdatedAt(data.updated_at ?? new Date().toISOString());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">{meta.label}</h1>
          <p className="mt-1 text-sm text-pasha-muted max-w-2xl">{meta.description}</p>
          {updatedAt && (
            <p className="mt-1 text-xs text-pasha-muted">
              Last updated {format(parseISO(updatedAt), "MMM d, yyyy · h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-3 py-2 text-xs font-medium text-pasha-ink hover:bg-pasha-stone/60"
          >
            <Eye className="w-3.5 h-3.5" />
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-pasha-red px-5 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] px-4 py-3 text-sm text-pasha-red">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-pasha-line bg-white p-5 sm:p-6 space-y-4">
        <label className="block">
          <span className="text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
            Heading
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-pasha-line bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
          />
        </label>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
            Content
          </span>
          {preview ? (
            <div className="mt-1.5 rounded-lg border border-pasha-line bg-pasha-stone/20 px-4 py-4 max-h-[60vh] overflow-y-auto">
              <RichText
                value={body}
                className="prose prose-sm max-w-none text-sm leading-relaxed text-pasha-ink"
              />
            </div>
          ) : (
            <div className="mt-1.5">
              <RichTextEditor value={body} onChange={setBody} sourceTabs />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
