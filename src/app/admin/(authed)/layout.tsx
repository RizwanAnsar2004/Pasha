import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import { ApiUnauthorizedHandler } from "@/components/ApiUnauthorizedHandler";
import { AdminShell } from "./AdminShell";
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
    <>
      <ApiUnauthorizedHandler realm="admin" />
      <AdminShell userMenu={<AdminUserMenu email={email} />}>
        {children}
      </AdminShell>
    </>
  );
}
