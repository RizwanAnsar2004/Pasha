import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ApplyHero } from "@/components/form/ApplyHero";
import { ApplyForm } from "@/components/form/ApplyForm";

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

export default function ApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ApplyHero />
        <section className="bg-white border-t border-pasha-line">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
            <ApplyForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
