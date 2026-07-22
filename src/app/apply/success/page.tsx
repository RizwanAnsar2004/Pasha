import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessContent } from "./SuccessContent";

export const metadata: Metadata = {
  title: "Application submitted",
  description: "Your application has been submitted to the PASHA Startup Hub.",
  alternates: { canonical: "/apply/success" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
