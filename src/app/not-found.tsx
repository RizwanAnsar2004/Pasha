import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30 grid place-items-center px-5 py-20">
        <div className="text-center max-w-lg">
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-pasha-red">
            404
          </span>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl tracking-tight text-pasha-ink">
            Page not found
          </h1>
          <p className="mt-5 text-pasha-muted leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist. It may have
            moved or never existed in the first place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full bg-pasha-red px-7 py-3 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Back to home
            </Link>
            <Link
              href="/directory"
              className="inline-flex items-center gap-2 rounded-full border border-pasha-line bg-white px-7 py-3 text-sm text-pasha-ink hover:bg-pasha-stone/60 transition-colors"
            >
              Browse the directory
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
