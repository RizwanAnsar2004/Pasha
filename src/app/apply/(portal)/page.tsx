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
} from "@/lib/auth/applicant/applicant-auth";
import { getFormConfig } from "@/lib/forms/form-config.server";
import { ensureClaimedProfileSeeded } from "@/lib/startups/claim/seed-application.server";
import { buildDevPrefill, buildFieldLabelMap, buildZodSchema } from "@/lib/forms/form-config";
import { submissionSchema } from "@/lib/forms/schema";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { computeCompletion, computeFormModules, fieldLabelMap } from "@/lib/forms/profile-completion";
import { deriveStage, stageMeta, type WorkflowStage } from "@/lib/startups/vetting/workflow";
import { deriveBadges, isYes, type BadgeTone } from "@/lib/startups/vetting/badges";
import { ReapplyButton } from "./ReapplyButton";
import { PortalTabs } from "./PortalTabs";
import { StartApplicationButton } from "./StartApplicationButton";
import { StepLink } from "./StepLink";
import { SubmitForApprovalButton } from "./SubmitForApprovalButton";
import { DynamicForm } from "@/components/form/DynamicForm";
import { ApplyForm } from "@/components/form/ApplyForm";
import { RichText } from "@/components/ui/RichText";
import { getOptionIndex } from "@/lib/options/index.server";
import { resolveOptionLabel } from "@/lib/options/resolve";

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

// Highlighted container border for an EARNED badge, matching its pill tone so acquired badges visibly stand out from locked ones.
const BADGE_BORDER_CLASS: Record<BadgeTone, string> = {
  verified: "border-pasha-red/40",
  gold: "border-amber-300",
  pink: "border-pink-300",
  blue: "border-sky-300",
  green: "border-green-400/60",
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

// Whether to prefill the form with the Western debug sample company.
function debugPrefillEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false; // never in prod
  const flag = process.env.DEBUG_FORM_PREFILL;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}

export default async function ApplicantOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; step?: string }>;
}) {
  // The layout gates this section, but a layout redirect doesn't stop the page from rendering in parallel — so guard here too (and narrow ctx.user).
  const ctx = await getApplicantContext();
  if (ctx.status !== "applicant") {
    redirect(ctx.status === "admin" ? "/apply/login?error=admin" : "/apply/login?redirect=/apply");
  }
  const user = ctx.user;
  // Self-heal: if this account claimed a directory profile but its application
  // hasn't been materialised yet, seed it now so the portal shows that startup
  // (filled + submitted) instead of a blank draft.
  await ensureClaimedProfileSeeded(user.id, user.email ?? null);
  const [draft, config, optionLists] = await Promise.all([
    getApplicantDraft(user.id),
    getFormConfig(),
    getFormOptionRegistry(),
  ]);

  // Workflow status of the (latest) submission, if any.
  const submissionStatus = draft.submission_id
    ? await getApplicantSubmissionStatus(draft.submission_id)
    : null;

  const stage = deriveStage({
    // Must be the draft's own submitted flag, not "a submission row exists".
    // Reopening after a rejection clears submitted_at but deliberately keeps
    // submission_id, so keying off the submission row left the stage stuck on
    // "rejected" — the Reapply button then never unmounted and its spinner
    // span forever even though the API had succeeded.
    submitted: draft.submitted,
    status: submissionStatus?.status,
    pashaVerified: submissionStatus?.pashaVerified,
    featuredActive: submissionStatus?.featuredActive,
  });
  const meta = stageMeta(stage);
  const tone = TONE[meta.tone] ?? TONE.neutral;
  const StageIcon = STAGE_ICON[stage] ?? ClipboardList;

  // The form is editable while the applicant owns it: never submitted, or the committee reopened it for changes (Needs Update resets submitted_at).
  const editable = !draft.submitted;

  // §12 completion ladder, from the saved draft values. Used for the milestone
  // chips + next-level hint.
  const completion = computeCompletion(draft.data, config ? fieldLabelMap(config) : undefined);
  // Dashboard modules mirror the application's actual steps (title + subtitle + per-step progress) so they stay in sync with the form builder.
  const modules = config ? computeFormModules(config, draft.data) : [];

  // Headline "Profile complete" percent. When a form config exists, base it on
  // the SAME field universe the per-section cards count — otherwise the ladder's
  // curated 24-field percent could read 100% while section cards still show
  // empty fields (e.g. Documents 2/7). Falls back to the ladder percent only
  // when there's no config to count against.
  const moduleTotals = modules.reduce(
    (acc, m) => ({ filled: acc.filled + m.filled, total: acc.total + m.total }),
    { filled: 0, total: 0 }
  );
  const overallPercent =
    moduleTotals.total > 0
      ? Math.round((moduleTotals.filled / moduleTotals.total) * 100)
      : completion.percent;

  // Would the saved draft pass submission today? Uses the exact schema
  // /api/submit enforces, so the dashboard's Submit button can never disagree
  // with the one at the end of the wizard.
  const submitSchema =
    config && config.length > 0 ? buildZodSchema(config) : submissionSchema;
  const submitCheck = submitSchema.safeParse(draft.data);
  const canSubmit = submitCheck.success;
  const submitLabelMap = config && config.length > 0 ? buildFieldLabelMap(config) : {};
  // One label per failing field — nested paths (founders.0.email) collapse to
  // their owning field so the hint stays readable.
  const missingForSubmit = submitCheck.success
    ? []
    : Array.from(
        new Set(
          submitCheck.error.issues
            .map((i) => String(i.path[0] ?? ""))
            .filter(Boolean)
        )
      ).map((k) => submitLabelMap[k] ?? k);

  const d = draft.data as Record<string, unknown>;

  // §13 badges — derived from the startup's own data (women-led/hiring/raising) plus admin-awarded verified/featured.
  const badges = deriveBadges({
    pashaVerified: submissionStatus?.pashaVerified,
    featuredActive: submissionStatus?.featuredActive,
    womenLed: isYes(d["women_led"]),
    hiring: isYes(d["currently_hiring"]),
    fundraising: isYes(d["currently_raising"]),
  });

  // ---- Registration snapshot (from §3 fields stored in the draft) ----------
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  const optionIndex = await getOptionIndex();
  const labelFromList = (listKey: string, value: unknown): string => {
    if (typeof value !== "string" || !value) return "";
    return (
      optionLists[listKey]?.find((o) => o.value === value)?.label ??
      resolveOptionLabel(optionIndex, listKey, value) ??
      ""
    );
  };
  const fullName = str("full_name");
  const firstName = fullName.split(/\s+/)[0] || "";
  const startupName = str("startup_name");
  const tagline = str("tagline");
  const location = [
    labelFromList("HQ_CITIES", d["hq_city"]) || str("hq_other"),
    labelFromList("COUNTRIES", d["hq_country"]),
  ]
    .filter(Boolean)
    .join(", ");
  const startupFacts = [
    { icon: Tag, label: "Tagline", value: tagline, rich: true },
    { icon: Layers, label: "Stage", value: labelFromList("STAGES", d["stage"]), rich: false },
    { icon: Sparkles, label: "Sector", value: labelFromList("SECTORS", d["primary_sector"]), rich: false },
    { icon: MapPin, label: "Location", value: location, rich: false },
    { icon: Phone, label: "Mobile / WhatsApp", value: str("founder_mobile"), rich: false },
  ].filter((f) => f.value);
  const greetingName = firstName || startupName;

  // CTA label by stage.
  const ctaLabel = editable
    ? draft.started
      ? canSubmit
        ? "Review application"
        : "Continue application"
      : "Start application"
    : "Browse the directory";

  // ---- Build the form tab node (only meaningful while editable) -------------
  const { tab, step } = await searchParams;
  const stepParam = step != null ? Number.parseInt(step, 10) : NaN;
  const initialStep = Number.isFinite(stepParam)
    ? Math.max(0, stepParam)
    : draft.current_step;

  const draftEmpty = !draft.data || Object.keys(draft.data).length === 0;
  const usePrefill =
    debugPrefillEnabled() && draftEmpty && config != null && config.length > 0;
  const initialValues = usePrefill ? buildDevPrefill(config, optionLists) : draft.data;

  const formNode = editable ? (
    config && config.length > 0 ? (
      <DynamicForm
        config={config}
        initialValues={initialValues}
        initialStep={initialStep}
        serverPersist
        optionLists={optionLists}
      />
    ) : (
      <ApplyForm optionLists={optionLists} />
    )
  ) : null;

  const overview = (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl tracking-tight text-pasha-ink">
          {greetingName ? `Welcome, ${greetingName}` : "Welcome"} 👋
        </h1>
        <p className="mt-1.5 text-sm text-pasha-muted">
          {editable
            ? "Apply to join the PASHA Startup Hub. Your progress is saved automatically — you can leave and pick up where you left off anytime."
            : "Here's the status of your PASHA Startup Hub application."}
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
                    <dd className="text-sm text-pasha-ink break-words">
                      {f.rich ? <RichText value={f.value} /> : f.value}
                    </dd>
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
              {overallPercent}%
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
          <div className="h-full rounded-full bg-pasha-red transition-all" style={{ width: `${overallPercent}%` }} />
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

        {/* The "add X next" nudge only makes sense while the applicant can still
            edit — once it's with the committee there's no action to take. */}
        {editable && completion.nextLevel && completion.nextLevel.missing.length > 0 && (
          <p className="mt-4 text-sm text-pasha-muted">
            <span className="font-medium text-pasha-ink">
              Next — {completion.nextLevel.label} ({completion.nextLevel.percent}%):
            </span>{" "}
            add {completion.nextLevel.missing.map((m) => m.label).join(", ")}.
          </p>
        )}

        {!editable && stage !== "rejected" && (
          <p className="mt-4 rounded-lg border border-pasha-line bg-pasha-stone/30 px-3 py-2 text-sm text-pasha-muted leading-relaxed">
            <span className="font-medium text-pasha-ink">No action needed right now.</span>{" "}
            {stage === "submitted"
              ? "Your application is locked while the committee reviews it — we'll email you when the status changes."
              : "Your profile is locked. We'll email you if the committee needs anything."}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {stage === "rejected" ? (
            <ReapplyButton />
          ) : editable ? (
            <>
              <StartApplicationButton
                label={stage === "needs_update" ? "Edit & resubmit" : ctaLabel}
                variant={draft.started && canSubmit ? "secondary" : "primary"}
              />
              {/* Only once there's something to send — a disabled Submit on an */}
              {/* untouched application is noise. */}
              {draft.started && (
                <SubmitForApprovalButton
                  data={d}
                  canSubmit={canSubmit}
                  missing={missingForSubmit}
                />
              )}
            </>
          ) : (
            <Link
              href="/directory"
              className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-pasha-red-dark transition-all"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Why Submit is disabled. Sits below the row rather than under the
            button so it can't knock the buttons out of alignment. */}
        {editable && draft.started && !canSubmit && missingForSubmit.length > 0 && (
          <p className="mt-3 text-xs text-pasha-muted">
            <span className="font-medium text-pasha-ink">To submit, still needed:</span>{" "}
            {missingForSubmit.slice(0, 5).join(", ")}
            {missingForSubmit.length > 5 ? ` +${missingForSubmit.length - 5} more` : ""}.
          </p>
        )}
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
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                b.earned ? BADGE_BORDER_CLASS[b.tone] : "border-dashed border-pasha-line bg-pasha-stone/20"
              }`}
            >
              <span className="mt-0.5 shrink-0 w-20">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    b.earned ? BADGE_TONE_CLASS[b.tone] : "bg-pasha-stone text-pasha-muted"
                  }`}
                >
                  {b.short}
                </span>
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
                  <StepLink step={m.step} label={m.percent >= 100 ? "Review" : "Complete"} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PortalTabs
      overview={overview}
      form={formNode}
      formAvailable={editable}
      initialTab={tab === "form" ? "form" : "overview"}
    />
  );
}
