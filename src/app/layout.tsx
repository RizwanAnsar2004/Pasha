import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import { PageReadyProvider } from "@/components/PageReady";

// Google Analytics 4 measurement ID (G-XXXXXXXXXX). When unset, GA is skipped
// entirely — keeps local dev and previews out of the production property.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SITE_NAME = "P@SHA Startup Community";
const SITE_DESCRIPTION =
  "Pakistan's curated network of product-native startups. Apply to join the P@SHA Startups & Entrepreneurship Committee for the directory, mentorship, and ecosystem partnerships.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pasha-startup-platform.vercel.app";

export const viewport: Viewport = {
  themeColor: "#E6160F",
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
    "P@SHA",
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
  authors: [{ name: "P@SHA Startups & Entrepreneurship Committee" }],
  creator: "P@SHA",
  publisher: "P@SHA",
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
        alt: "P@SHA Startup Community — EOI Join the P@SHA Startup Community",
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
  // Next.js auto-discovers src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico
  // No manual icons array needed — overriding here would suppress that auto-discovery.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- app/layout.tsx is the correct place for global fonts in the App Router */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;600&family=Source+Serif+4:ital,wght@0,300..700;1,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <PageReadyProvider>
          {/* Per-navigation enter animation lives in app/template.tsx, which Next
              nests between this layout and the page. */}
          {children}
          <ChatWidget />
        </PageReadyProvider>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
