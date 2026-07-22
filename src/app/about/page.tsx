import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About PSEC",
  description:
    "About the PASHA Startup Hub — maintained by the Pakistan Software Houses Association (PASHA). A curated registry of Pakistani startups, founders, investors, and ecosystem enablers.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About PSEC · PASHA Startup Hub",
    url: "/about",
  },
  twitter: {
    title: "About PSEC · PASHA Startup Hub",
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AboutContent />
      </main>
      <SiteFooter />
    </>
  );
}
