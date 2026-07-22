import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactContent } from "@/components/contact/ContactContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the PASHA Startup Hub team — questions about listings, verification, partnerships or the wider Pakistani startup ecosystem.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · PASHA Startup Hub",
    url: "/contact",
  },
  twitter: {
    title: "Contact · PASHA Startup Hub",
  },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ContactContent />
      </main>
      <SiteFooter />
    </>
  );
}
