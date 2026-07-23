import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AboutContent } from "@/components/about/AboutContent";
import { getCommitteeMembers } from "@/lib/committee/committee.server";

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

// The committee roster is admin-managed, so render fresh rather than at build.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const members = await getCommitteeMembers();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AboutContent members={members} />
      </main>
      <SiteFooter />
    </>
  );
}
