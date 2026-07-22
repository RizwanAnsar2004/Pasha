import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifiedContent } from "./VerifiedContent";

export const metadata: Metadata = {
  title: "Email verified",
  description: "Your email has been verified for the PASHA Startup Hub.",
  alternates: { canonical: "/apply/verified" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function VerifiedPage() {
  return (
    <Suspense fallback={null}>
      <VerifiedContent />
    </Suspense>
  );
}
