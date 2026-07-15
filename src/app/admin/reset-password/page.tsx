import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";

export const metadata = { title: "Reset password" };

export default function AdminResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div className="mx-auto max-w-md px-4 sm:px-8 py-20">
          <ResetPasswordCard loginHref="/admin/login" minLength={8} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
