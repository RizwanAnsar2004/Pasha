import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import { ApiUnauthorizedHandler } from "@/components/ApiUnauthorizedHandler";
import { AdminSidebar } from "./AdminSidebar";
import { AdminUserMenu } from "./AdminUserMenu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = await readAdminSession();

  if (!email && process.env.NODE_ENV !== "production") {
    email = "review@localhost (bypass)";
  }

  if (!email) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <ApiUnauthorizedHandler realm="admin" />

      {/* Collapsible drawer sidebar */}
      <AdminSidebar userMenu={<AdminUserMenu email={email} />} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 bg-white/80 backdrop-blur border-b border-slate-200/70 px-8">
          <span className="text-sm font-medium text-slate-800">PSEC Admin Panel</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
