import { redirect } from "next/navigation";
import { getApplicantContext } from "@/lib/auth/applicant/applicant-auth";
import { getRegistrationConfig } from "@/lib/forms/form-config.server";
import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { getSiteContent } from "@/lib/content/site-content.server";
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
  const [registrationConfig, optionLists, terms] = await Promise.all([
    getRegistrationConfig(),
    getFormOptionRegistry(),
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
