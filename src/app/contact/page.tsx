import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactContent } from "@/components/contact/ContactContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the P@SHA Secretariat — phone, email, and office address for the Pakistan Software Houses Association Startup Hub.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · P@SHA Startup Hub",
    url: "/contact",
  },
  twitter: {
    title: "Contact · P@SHA Startup Hub",
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
