import { redirect } from "next/navigation";
import { getApplicantContext } from "@/lib/applicant-auth";
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

  return <ApplyAuthForm />;
}
