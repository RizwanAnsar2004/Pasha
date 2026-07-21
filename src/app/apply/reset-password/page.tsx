import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { APPLICANT_MIN_PASSWORD_LENGTH } from "@/lib/auth/applicant/applicant-password";

export const metadata = { title: "Reset password" };

export default function ApplicantResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div className="mx-auto max-w-md px-4 sm:px-8 py-20">
          <ResetPasswordCard loginHref="/apply/login" minLength={APPLICANT_MIN_PASSWORD_LENGTH} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
