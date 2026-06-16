import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-session";
import { AdminLoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const email = await readAdminSession();
  if (email) {
    const { redirect: redirectTo } = await searchParams;
    redirect(redirectTo ?? "/admin");
  }

  return <AdminLoginForm />;
}
