import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSuperAdminSession } from "@/lib/auth/admin/super-admin";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminsManager, type AdminRow } from "./AdminsManager";

export const metadata: Metadata = {
  title: "Super admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function load() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_users")
    .select("email, added_at, added_by, notes")
    .order("added_at", { ascending: true });
  return (data ?? []) as AdminRow[];
}

export default async function SuperAdminDashboard() {
  const sub = await readSuperAdminSession();
  if (!sub) redirect("/super-admin/login");
  const admins = await load();
  return <AdminsManager subject={sub} initial={admins} />;
}
