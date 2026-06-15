import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import { PashaLogo } from "@/components/PashaLogo";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = await readAdminSession();

  // ── TEMP REVIEW BYPASS (local dev only) ────────────────────
  // Stand in a placeholder identity so the gated pages render without a
  // login. Guarded by NODE_ENV so a production build still redirects.
  // REMOVE before relying on real auth again.
  if (!email && process.env.NODE_ENV !== "production") {
    email = "review@localhost (bypass)";
  }

  if (!email) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-pasha-stone/30">
      <header className="border-b border-pasha-line bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PashaLogo width={100} href="/admin" />
            <span className="hidden md:block h-4 w-px bg-pasha-line" />
            <span className="hidden md:block font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
              PSEC Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-pasha-muted">{email}</span>
            <form action="/admin/logout" method="post">
              <button
                type="submit"
                className="text-xs text-pasha-muted hover:text-pasha-red transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
        <AdminNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
