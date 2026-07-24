import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/apply", "/about", "/directory"],
        // The unlisted event landing pages are reachable by direct link only.
        // Both the clean URL and the underlying static file are listed; each
        // page also sends X-Robots-Tag: noindex (next.config.ts) and carries a
        // robots meta tag, since Disallow alone only stops crawling, not
        // indexing of a URL discovered elsewhere.
        //
        // Keep in sync with STATIC_EVENT_PAGES in next.config.ts — that file is
        // outside the src alias, so the list cannot be shared.
        disallow: [
          "/admin",
          "/api",
          "/apply/success",
          "/launch",
          "/launch.html",
          "/hub-launch",
          "/hub-launch.html",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
