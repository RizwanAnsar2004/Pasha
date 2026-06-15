import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSuperAdminSession } from "@/lib/super-admin";
import { SuperAdminLoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Super admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLoginPage() {
  // Already signed in → straight to the dashboard.
  const sub = await readSuperAdminSession();
  if (sub) redirect("/super-admin");
  return <SuperAdminLoginForm />;
}
