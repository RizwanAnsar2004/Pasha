import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CommitteeContent } from "@/components/committee/CommitteeContent";

export const metadata: Metadata = {
  title: "Committee",
  description:
    "The P@SHA Startups & Entrepreneurship Committee brings together Pakistan's top founders, investors, corporates, and government leaders to grow, connect, and support the national startup ecosystem.",
  alternates: { canonical: "/committee" },
  openGraph: {
    title: "Committee · P@SHA Startup Community",
    url: "/committee",
  },
  twitter: {
    title: "Committee · P@SHA Startup Community",
  },
};

export default function CommitteePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <CommitteeContent />
      </main>
      <SiteFooter />
    </>
  );
}
