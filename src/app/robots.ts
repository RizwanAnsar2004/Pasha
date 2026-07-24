import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/apply", "/about", "/directory"],
        // /launch is the unlisted event landing page — reachable by direct link
        // only. Both its clean URL and the underlying static file are listed;
        // the page also sends X-Robots-Tag: noindex (next.config.ts) and carries
        // a robots meta tag, since Disallow alone only stops crawling, not
        // indexing of a URL discovered elsewhere.
        disallow: ["/admin", "/api", "/apply/success", "/launch", "/launch.html"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
