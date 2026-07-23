import type { Metadata, Viewport } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Suspense } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { RouteProgressProvider } from "@/components/RouteProgress";
import { SITE_URL } from "@/lib/utils/site-url";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Google Analytics 4 measurement ID (G-XXXXXXXXXX).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SITE_NAME = "PASHA Startup Hub";
const SITE_DESCRIPTION =
  "Pakistan's curated network of product-native startups. Apply to join the PASHA Startup & Entrepreneurship Committee for the directory, mentorship, and ecosystem partnerships.";
export const viewport: Viewport = {
  themeColor: "#E92127",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "PASHA",
    "PASHA",
    "Pakistan Software Houses Association",
    "Pakistan startups",
    "PSEC",
    "startup directory",
    "product-native",
    "FinTech",
    "AgriTech",
    "SaaS",
    "Pakistan technology",
    "Startups & Entrepreneurship Committee",
  ],
  authors: [{ name: "PASHA Startup & Entrepreneurship Committee" }],
  creator: "PASHA",
  publisher: "PASHA",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1500,
        height: 375,
        alt: "PASHA Startup Hub — EOI Join the PASHA Startup Hub",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@PASHAORG",
    creator: "@PASHAORG",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Next.js auto-discovers src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico No manual icons array needed — overriding here would suppress.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Top bar shown while a navigation is in flight, plus the context that
            lets programmatic flows (sign-in, submit) trigger it. Suspense
            because it reads useSearchParams, which would otherwise opt every
            page out of static rendering. */}
        <Suspense fallback={children}>
          <RouteProgressProvider>
            {/* Per-navigation enter animation lives in app/template.tsx */}
            {children}
          </RouteProgressProvider>
        </Suspense>
        <ChatWidget />
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
