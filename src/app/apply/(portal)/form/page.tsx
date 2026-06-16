import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApplyForm } from "@/components/form/ApplyForm";
import { DynamicForm } from "@/components/form/DynamicForm";
import { getFormConfig } from "@/lib/form-config.server";
import { getOptionRegistry } from "@/lib/option-lists.server";
import { getApplicantContext, getApplicantDraft } from "@/lib/applicant-auth";

export const metadata: Metadata = {
  title: "Apply",
  alternates: { canonical: "/apply/form" },
};

export default async function ApplicantFormPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  // The layout gates this section, but a layout redirect doesn't stop the page
  // from rendering in parallel — so guard here too (and narrow ctx.user).
  const ctx = await getApplicantContext();
  console.log("ctx", ctx);
  if (ctx.status !== "applicant") {
    redirect(ctx.status === "admin" ? "/apply/login?error=admin" : "/apply/login?redirect=/apply");
  }
  const user = ctx.user;

  const [config, draft, optionLists] = await Promise.all([
    getFormConfig(),
    getApplicantDraft(user.id),
    getOptionRegistry(),
  ]);

  // Already submitted → there's nothing to edit; send them to the overview.
  if (draft.submitted) redirect("/apply");

  // Module cards on the dashboard deep-link to a specific step (?step=N,
  // 0-based). Fall back to the auto-saved step. DynamicForm clamps the range.
  const { step } = await searchParams;
  const stepParam = step != null ? Number.parseInt(step, 10) : NaN;
  const initialStep = Number.isFinite(stepParam) ? Math.max(0, stepParam) : draft.current_step;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/apply"
          className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to overview
        </Link>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-pasha-ink">
          Tell us about your startup
        </h1>
        <p className="mt-1.5 text-sm text-pasha-muted">
          A few quick steps. We auto-save your progress as you go.
        </p>
      </div>

      {config && config.length > 0 ? (
        <DynamicForm
          config={config}
          initialValues={draft.data}
          initialStep={initialStep}
          serverPersist
          optionLists={optionLists}
        />
      ) : (
        <ApplyForm />
      )}
    </div>
  );
}
