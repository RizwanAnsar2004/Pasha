import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  Phone,
  Layers,
  Tag,
  ClipboardList,
  AlertCircle,
  BadgeCheck,
  Star,
  Clock,
} from "lucide-react";
import {
  getApplicantContext,
  getApplicantDraft,
  getApplicantSubmissionStatus,
} from "@/lib/applicant-auth";
import { getFormConfig } from "@/lib/form-config.server";
import { getOptionRegistry } from "@/lib/option-lists.server";
import { computeCompletion, computeFormModules, fieldLabelMap } from "@/lib/profile-completion";
import { deriveStage, stageMeta, type WorkflowStage } from "@/lib/workflow";
import { deriveBadges, isYes, type BadgeTone } from "@/lib/badges";

export const metadata: Metadata = {
  title: "Your application",
  alternates: { canonical: "/apply" },
};

// Tailwind classes per stage tone (badge + accent).
const TONE: Record<string, { badge: string; bar: string; ring: string }> = {
  neutral: { badge: "bg-pasha-stone/80 text-pasha-ink/70", bar: "bg-pasha-ink/60", ring: "border-pasha-line" },
  info: { badge: "bg-sky-50 text-sky-700", bar: "bg-sky-500", ring: "border-sky-200" },
  warn: { badge: "bg-amber-50 text-amber-800", bar: "bg-amber-500", ring: "border-amber-200" },
  success: { badge: "bg-green-600/10 text-green-700", bar: "bg-green-600", ring: "border-green-200" },
  danger: { badge: "bg-pasha-red/10 text-pasha-red", bar: "bg-pasha-red", ring: "border-pasha-red/20" },
  gold: { badge: "bg-amber-100 text-amber-800", bar: "bg-amber-400", ring: "border-amber-300" },
};

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  verified: "bg-pasha-red/10 text-pasha-red",
  gold: "bg-amber-100 text-amber-800",
  pink: "bg-pink-50 text-pink-700",
  blue: "bg-sky-50 text-sky-700",
  green: "bg-green-600/10 text-green-700",
};

const STAGE_ICON: Record<WorkflowStage, typeof CheckCircle2> = {
  draft: ClipboardList,
  submitted: Clock,
  needs_update: AlertCircle,
  rejected: AlertCircle,
  approved: CheckCircle2,
  verified: BadgeCheck,
  featured: Star,
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

  // Workflow status of the (latest) submission, if any.
  const submissionStatus = draft.submission_id
    ? await getApplicantSubmissionStatus(draft.submission_id)
    : null;

  const stage = deriveStage({
    submitted: Boolean(submissionStatus),
    status: submissionStatus?.status,
    pashaVerified: submissionStatus?.pashaVerified,
    featuredActive: submissionStatus?.featuredActive,
  });
  const meta = stageMeta(stage);
  const tone = TONE[meta.tone] ?? TONE.neutral;
  const StageIcon = STAGE_ICON[stage] ?? ClipboardList;

  // The form is editable while the applicant owns it: never submitted, or the
  // committee reopened it for changes (Needs Update resets submitted_at).
  const editable = !draft.submitted;

  // §12 completion ladder, from the saved draft values. Field labels in the
  // hints come from the live form config (falls back to built-in names).
  const completion = computeCompletion(draft.data, config ? fieldLabelMap(config) : undefined);
  // Dashboard modules mirror the application's actual steps (title + subtitle +
  // per-step progress) so they stay in sync with the form builder.
  const modules = config ? computeFormModules(config, draft.data) : [];

  const d = draft.data as Record<string, unknown>;

  // §13 badges — derived from the startup's own data (women-led/hiring/raising)
  // plus admin-awarded verified/featured.
  const badges = deriveBadges({
    pashaVerified: submissionStatus?.pashaVerified,
    featuredActive: submissionStatus?.featuredActive,
    womenLed: isYes(d["women_led"]),
    hiring: isYes(d["currently_hiring"]),
    fundraising: isYes(d["currently_raising"]),
  });

  // ---- Registration snapshot (from §3 fields stored in the draft) ----------
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  const labelFromList = (listKey: string, value: unknown): string => {
    if (typeof value !== "string" || !value) return "";
    return optionLists[listKey]?.find((o) => o.value === value)?.label ?? value;
  };
  const fullName = str("full_name");
  const firstName = fullName.split(/\s+/)[0] || "";
  const startupName = str("startup_name");
  const tagline = str("tagline");
  const location = [str("hq_city") || str("hq_other"), str("hq_country")].filter(Boolean).join(", ");
  const startupFacts = [
    { icon: Tag, label: "Tagline", value: tagline },
    { icon: Layers, label: "Stage", value: labelFromList("STAGES", d["stage"]) },
    { icon: Sparkles, label: "Sector", value: labelFromList("SECTORS", d["primary_sector"]) },
    { icon: MapPin, label: "Location", value: location },
    { icon: Phone, label: "Mobile / WhatsApp", value: str("founder_mobile") },
  ].filter((f) => f.value);
  const greetingName = firstName || startupName;

  // CTA target + label by stage.
  const cta =
    editable
      ? { href: "/apply/form", label: draft.started ? "Continue application" : "Start application" }
      : stage === "submitted"
      ? { href: "/apply/form", label: "View application" }
      : { href: "/directory", label: "Browse the directory" };

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

      {/* Startup snapshot — identity captured at registration (profile header) */}
      {(startupName || startupFacts.length > 0) && (
        <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pasha-red/10 grid place-items-center shrink-0">
              <Building2 className="w-5 h-5 text-pasha-red" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-pasha-ink truncate">{startupName || "Your startup"}</h2>
              <p className="text-xs text-pasha-muted">From your registration — refine these in the application.</p>
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

      {/* Status + completion — one hero card (spec §12) */}
      <div className={`rounded-2xl border bg-white p-6 sm:p-7 ${tone.ring}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone.badge}`}>
              <StageIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-pasha-ink">{meta.label}</h2>
              <p className="mt-1 text-sm text-pasha-muted">{meta.blurb}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-serif text-4xl text-pasha-ink tabular-nums leading-none">
              {completion.percent}%
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">
              Profile complete
            </div>
          </div>
        </div>

        {/* Committee notes on Needs Update / Rejected */}
        {(stage === "needs_update" || stage === "rejected") && submissionStatus?.reviewerNotes ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Committee notes: </span>
            {submissionStatus.reviewerNotes}
          </div>
        ) : null}

        <div className="mt-5 h-2 rounded-full bg-pasha-line/60 overflow-hidden">
          <div className="h-full rounded-full bg-pasha-red transition-all" style={{ width: `${completion.percent}%` }} />
        </div>

        {/* Level milestones — the highlighted chip is the current completion level */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {completion.levels.map((lvl) => (
            <div
              key={lvl.key}
              className={`rounded-lg border px-3 py-2 text-center ${
                lvl.met ? "border-green-200 bg-green-50" : "border-pasha-line bg-white"
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                {lvl.met ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <span className="text-[11px] font-mono text-pasha-muted">{lvl.percent}%</span>
                )}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-pasha-ink/80">{lvl.label}</div>
            </div>
          ))}
        </div>

        {completion.nextLevel && completion.nextLevel.missing.length > 0 && (
          <p className="mt-4 text-sm text-pasha-muted">
            <span className="font-medium text-pasha-ink">
              Next — {completion.nextLevel.label} ({completion.nextLevel.percent}%):
            </span>{" "}
            add {completion.nextLevel.missing.map((m) => m.label).join(", ")}.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href={cta.href}
            className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
          >
            {stage === "needs_update" ? "Edit & resubmit" : cta.label}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {(stage === "approved" || stage === "verified" || stage === "featured") && (
            <Link
              href="/directory"
              className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-all"
            >
              Browse the directory
            </Link>
          )}
        </div>
      </div>

      {/* Badges (spec §13) — earned + how to earn the rest */}
      <div className="rounded-2xl border border-pasha-line bg-white p-6 sm:p-7">
        <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">Badges</h3>
        <p className="mt-1 text-sm text-pasha-muted">
          Badges help you stand out on the public directory.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {badges.map((b) => (
            <div
              key={b.key}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                b.earned ? "border-pasha-line" : "border-dashed border-pasha-line bg-pasha-stone/20"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                  b.earned ? BADGE_TONE_CLASS[b.tone] : "bg-pasha-stone text-pasha-muted"
                }`}
              >
                {b.short}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-pasha-ink">{b.description}</p>
                {!b.earned && <p className="mt-0.5 text-xs text-pasha-muted">{b.howTo}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard modules — one card per application step (spec §12) */}
      {modules.length > 0 && (
        <div>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[2px] text-pasha-red">
            Application steps
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((m) => (
              <div key={m.step} className="rounded-2xl border border-pasha-line bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-medium text-pasha-ink">
                      <span className="font-mono text-xs text-pasha-muted mr-1.5">
                        {String(m.step + 1).padStart(2, "0")}
                      </span>
                      {m.title}
                    </h4>
                    {m.subtitle && (
                      <p className="mt-0.5 text-xs text-pasha-muted leading-relaxed">{m.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-mono text-pasha-muted tabular-nums">
                    {m.filled}/{m.total}
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-pasha-line/60 overflow-hidden">
                  <div className="h-full rounded-full bg-pasha-red/80 transition-all" style={{ width: `${m.percent}%` }} />
                </div>
                {editable && (
                  <Link
                    href={`/apply/form?step=${m.step}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-pasha-red hover:text-pasha-red-dark font-medium"
                  >
                    {m.percent >= 100 ? "Review" : "Complete"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
