"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/SelectMenu";

export type TemplateOption = { template_id: string; name: string };

type Scope = "custom" | "applicants" | "approved" | "databank" | "all_profiles";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "custom", label: "Specific addresses", hint: "Paste emails below (comma or newline separated)." },
  { value: "applicants", label: "All applicants", hint: "Everyone who has submitted an application." },
  { value: "approved", label: "Approved founders", hint: "Founders of approved submissions." },
  { value: "databank", label: "Directory contacts", hint: "Public databank contact emails." },
  { value: "all_profiles", label: "Everyone", hint: "Every account with an email address." },
];

const inputCls =
  "w-full rounded-lg border border-pasha-line bg-white px-3 py-2.5 text-sm text-pasha-ink placeholder:text-pasha-muted/70 focus:outline-none focus:border-pasha-red focus:ring-2 focus:ring-pasha-red/10";

export function BroadcastClient({ templates }: { templates: TemplateOption[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.template_id ?? "");
  const [scope, setScope] = useState<Scope>("custom");
  const [emailsText, setEmailsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const scopeHint = SCOPES.find((s) => s.value === scope)?.hint ?? "";

  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const emails =
        scope === "custom"
          ? emailsText.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
          : undefined;
      if (scope === "custom" && (!emails || emails.length === 0)) {
        throw new Error("Enter at least one email address.");
      }
      const res = await fetch("/api/admin/email-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, scope, emails }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setMsg({ kind: "ok", text: `Queued ${json.queued} recipient(s). Track delivery in Email Log.` });
      if (scope === "custom") setEmailsText("");
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-pasha-ink">Send Email</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Send an active template to a group of recipients. Delivery is processed in the background.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 text-sm text-pasha-muted shadow-sm">
          No active templates. Create one in Email Templates and set its status to <strong>Active</strong> first.
        </div>
      ) : (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-pasha-ink">Compose</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-pasha-ink">
              Template
              <SelectMenu
                className="mt-1.5 w-full"
                value={templateId}
                onValueChange={setTemplateId}
                options={templates.map((t) => ({ value: t.template_id, label: t.name }))}
              />
            </label>
            <label className="block text-sm text-pasha-ink">
              Recipients
              <SelectMenu
                className="mt-1.5 w-full"
                value={scope}
                onValueChange={(v) => setScope(v as Scope)}
                options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
              />
              <span className="mt-1.5 block text-xs font-normal text-pasha-muted">{scopeHint}</span>
            </label>
          </div>

          {scope === "custom" && (
            <label className="mt-4 block text-sm text-pasha-ink">
              Email addresses
              <textarea
                className={cn(inputCls, "mt-1.5 min-h-[120px] resize-y font-mono text-xs")}
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={"alice@example.com\nbob@example.com"}
              />
            </label>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={send}
              disabled={busy || !templateId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-5 py-2.5 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
            {msg && (
              <span className={cn("text-sm", msg.kind === "ok" ? "text-tier-featured" : "text-pasha-red")}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
