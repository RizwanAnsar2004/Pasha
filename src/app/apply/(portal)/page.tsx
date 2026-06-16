import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  Clock,
  Sparkles,
  Building2,
  MapPin,
  Phone,
  Layers,
  Tag,
} from "lucide-react";
import { getApplicantContext, getApplicantDraft } from "@/lib/applicant-auth";
import { getFormConfig } from "@/lib/form-config.server";
import { getOptionRegistry } from "@/lib/option-lists.server";
import { stepsOf } from "@/lib/form-config";

export const metadata: Metadata = {
  title: "Your application",
  alternates: { canonical: "/apply" },
};

export default async function ApplicantOverviewPage() {
  // The layout gates this section, but a layout redirect doesn't stop the page
  // from rendering in parallel — so guard here too (and narrow ctx.user).
  const ctx = await getApplicantContext();
  if (ctx.status !== "applicant") {
    redirect(ctx.status === "admin" ? "/apply/login?error=admin" : "/apply/login?redirect=/apply");
  }
  const user = ctx.user;
  const [draft, config, optionLists] = await Promise.all([
    getApplicantDraft(user.id),
    getFormConfig(),
    getOptionRegistry(),
  ]);
  const totalSteps = config ? stepsOf(config).length : 0;

  const status: "submitted" | "in_progress" | "not_started" = draft.submitted
    ? "submitted"
    : draft.started
    ? "in_progress"
    : "not_started";

  // The §3 fields captured at registration live in the draft (keyed by
  // field_key). Surface them as a read-only snapshot + greeting.
  const d = draft.data as Record<string, unknown>;
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  const labelFromList = (listKey: string, value: unknown): string => {
    if (typeof value !== "string" || !value) return "";
    return optionLists[listKey]?.find((o) => o.value === value)?.label ?? value;
  };

  const fullName = str("full_name");
  const firstName = fullName.split(/\s+/)[0] || "";
  const startupName = str("startup_name");
  const tagline = str("tagline");
  const location = [str("hq_city") || str("hq_other"), str("hq_country")]
    .filter(Boolean)
    .join(", ");

  const startupFacts = [
    { icon: Tag, label: "Tagline", value: tagline },
    { icon: Layers, label: "Stage", value: labelFromList("STAGES", d["stage"]) },
    { icon: Sparkles, label: "Sector", value: labelFromList("SECTORS", d["primary_sector"]) },
    { icon: MapPin, label: "Location", value: location },
    { icon: Phone, label: "Mobile / WhatsApp", value: str("founder_mobile") },
  ].filter((f) => f.value);

  const greetingName = firstName || startupName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-pasha-ink">
          {greetingName ? `Welcome, ${greetingName}` : "Welcome"} 👋
        </h1>
        <p className="mt-1.5 text-sm text-pasha-muted">
          Apply to join the P@SHA Startup Community. Your progress is saved automatically — you can
          leave and pick up where you left off anytime.
        </p>
      </div>

      {/* Startup snapshot — from the details captured at registration */}
      {(startupName || startupFacts.length > 0) && (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pasha-red/10 grid place-items-center shrink-0">
              <Building2 className="w-5 h-5 text-pasha-red" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-pasha-ink truncate">
                {startupName || "Your startup"}
              </h2>
              <p className="text-xs text-pasha-muted">
                From your registration — you can refine these in the application.
              </p>
            </div>
          </div>
          {startupFacts.length > 0 && (
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {startupFacts.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon className="w-4 h-4 mt-0.5 shrink-0 text-pasha-muted" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-mono uppercase tracking-[1.5px] text-pasha-muted">
                      {f.label}
                    </dt>
                    <dd className="text-sm text-pasha-ink break-words">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* Status card */}
      <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7">
        {status === "submitted" ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-600/10 grid place-items-center">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h2 className="font-medium text-pasha-ink">Application submitted</h2>
                <p className="text-sm text-pasha-muted">
                  The committee reviews submissions weekly — you&apos;ll hear back by email.
                </p>
              </div>
            </div>
            <Link
              href="/directory"
              className="mt-6 group inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
            >
              Browse the directory
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        ) : status === "in_progress" ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pasha-red/10 grid place-items-center">
                <Clock className="w-5 h-5 text-pasha-red" />
              </div>
              <div>
                <h2 className="font-medium text-pasha-ink">Application in progress</h2>
                <p className="text-sm text-pasha-muted">
                  {totalSteps > 0
                    ? `You're on step ${Math.min(draft.current_step + 1, totalSteps)} of ${totalSteps}.`
                    : "Pick up where you left off."}
                </p>
              </div>
            </div>
            <Link
              href="/apply/form"
              className="mt-6 group inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
            >
              Continue application
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pasha-stone grid place-items-center">
                <FileText className="w-5 h-5 text-pasha-ink/70" />
              </div>
              <div>
                <h2 className="font-medium text-pasha-ink">Ready when you are</h2>
                <p className="text-sm text-pasha-muted">
                  {totalSteps > 0
                    ? `${totalSteps} quick steps. Takes about 8 minutes.`
                    : "A few quick steps. Takes about 8 minutes."}
                </p>
              </div>
            </div>
            <Link
              href="/apply/form"
              className="mt-6 group inline-flex items-center gap-2 rounded-full bg-pasha-red px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
            >
              Start application
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </>
        )}
      </div>

      {/* What happens next */}
      {status !== "submitted" && (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7">
          <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-red flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            What happens next
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-pasha-ink/85 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red" aria-hidden />
              <span>Fill the form step by step — it saves as you go, no need to finish in one sitting.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red" aria-hidden />
              <span>Submit when you&apos;re ready. The P@SHA committee reviews submissions weekly.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-pasha-red" aria-hidden />
              <span>You&apos;ll get an email once your profile is approved and live on the directory.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
