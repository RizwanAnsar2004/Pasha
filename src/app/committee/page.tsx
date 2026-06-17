import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CommitteeContent } from "@/components/committee/CommitteeContent";
import {
  getCommitteeMembers,
  getPublishedCommitteeActivities,
} from "@/lib/committee.server";

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

export const dynamic = "force-dynamic";

export default async function CommitteePage() {
  const [members, activities] = await Promise.all([
    getCommitteeMembers(),
    getPublishedCommitteeActivities(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <CommitteeContent members={members} activities={activities} />
      </main>
      <SiteFooter />
    </>
  );
}
