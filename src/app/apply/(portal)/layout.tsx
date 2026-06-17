import { redirect } from "next/navigation";
import { ApiUnauthorizedHandler } from "@/components/ApiUnauthorizedHandler";
import { PashaLogo } from "@/components/PashaLogo";
import { getApplicantContext, getApplicantDraft } from "@/lib/applicant-auth";
import { PortalNav } from "./PortalNav";
import { ApplicantUserMenu } from "./ApplicantUserMenu";

// Per-applicant draft state — always render fresh.
export const dynamic = "force-dynamic";

/**
 * Applicant portal shell — mirrors the admin `(authed)` layout. Gates the whole
 * section: anonymous visitors go to sign-in; admin sessions are bounced (they
 * belong to the committee portal, never the apply flow).
 */
export default async function ApplicantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getApplicantContext();
  if (ctx.status === "anon") redirect("/apply/login?redirect=/apply");
  if (ctx.status === "admin") redirect("/apply/login?error=admin");

  const email = ctx.user.email ?? "";
  const draft = await getApplicantDraft(ctx.user.id);

  return (
    <div className="min-h-screen bg-pasha-stone/30 flex flex-col">
      <ApiUnauthorizedHandler realm="applicant" />
      <header className="border-b border-pasha-line bg-white">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PashaLogo width={100} href="/apply" />
            <span className="hidden md:block h-4 w-px bg-pasha-line" />
            <span className="hidden md:block font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
              Applicant Portal
            </span>
          </div>
          <ApplicantUserMenu email={email} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-8 flex-1">
        <PortalNav submitted={draft.submitted} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
