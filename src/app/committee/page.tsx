import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CommitteeContent } from "@/components/committee/CommitteeContent";
import {
  getCommitteeMembers,
  getPublishedCommitteeActivities,
} from "@/lib/committee/committee.server";

export const metadata: Metadata = {
  title: "Committee",
  description:
    "The PASHA Startup & Entrepreneurship Committee brings together Pakistan's top founders, investors, corporates, and government leaders to grow, connect, and support the national startup ecosystem.",
  alternates: { canonical: "/committee" },
  openGraph: {
    title: "Committee · PASHA Startup Hub",
    url: "/committee",
  },
  twitter: {
    title: "Committee · PASHA Startup Hub",
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
