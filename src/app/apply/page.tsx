import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ApplyHero } from "@/components/form/ApplyHero";
import { ApplyForm } from "@/components/form/ApplyForm";
import { DynamicForm } from "@/components/form/DynamicForm";
import { getFormConfig } from "@/lib/form-config.server";

// The form structure is admin-configurable. Always render the latest config.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply",
  description:
    "Apply to join the P@SHA Startup Community. Tell us about your startup in 3 quick steps.",
  alternates: { canonical: "/apply" },
  openGraph: {
    title: "Apply · P@SHA Startup Community",
    url: "/apply",
  },
  twitter: {
    title: "Apply · P@SHA Startup Community",
  },
};

export default async function ApplyPage() {
  // Admin-defined form config drives the form when present; otherwise we fall
  // back to the original hard-coded form so the page never breaks pre-seed.
  const config = await getFormConfig();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ApplyHero />
        <section className="bg-white border-t border-pasha-line">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
            {config && config.length > 0 ? <DynamicForm config={config} /> : <ApplyForm />}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
