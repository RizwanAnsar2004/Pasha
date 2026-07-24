import type { Metadata } from "next";
import { notFound } from "next/navigation";
// Route temporarily disabled — the super-admin login is not wanted right now.
// To re-enable, restore the imports/body below and remove the notFound() call.
// import { redirect } from "next/navigation";
// import { readSuperAdminSession } from "@/lib/auth/admin/super-admin";
// import { SuperAdminLoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Super admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLoginPage() {
  // Route disabled: return 404 instead of rendering the login form.
  notFound();

  // Original behaviour (re-enable by uncommenting and removing notFound above):
  // // Already signed in → straight to the dashboard.
  // const sub = await readSuperAdminSession();
  // if (sub) redirect("/super-admin");
  // return <SuperAdminLoginForm />;
}
