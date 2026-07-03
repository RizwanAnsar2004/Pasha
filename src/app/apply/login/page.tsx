import { redirect } from "next/navigation";
import { getApplicantContext } from "@/lib/applicant-auth";
import { getRegistrationConfig } from "@/lib/form-config.server";
import { getOptionRegistry } from "@/lib/option-lists.server";
import { getSiteContent } from "@/lib/site-content.server";
import { ApplyAuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default async function ApplyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const ctx = await getApplicantContext();
  if (ctx.status === "applicant") {
    const { redirect: redirectTo } = await searchParams;
    redirect(redirectTo ?? "/apply");
  }

  // The sign-up §3 fields are admin-configurable (form_key='registration').
  // Pre-migration/seed this is null → the form falls back to email+password only.
  const [registrationConfig, optionLists, terms] = await Promise.all([
    getRegistrationConfig(),
    getOptionRegistry(),
    getSiteContent("privacy_policy"),
  ]);

  return (
    <ApplyAuthForm
      registrationConfig={registrationConfig}
      optionLists={optionLists}
      terms={{ title: terms.title, body: terms.body }}
    />
  );
}
