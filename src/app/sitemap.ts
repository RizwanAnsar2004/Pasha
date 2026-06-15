import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pasha-startup-platform.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/apply`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/directory`, lastModified, changeFrequency: "daily", priority: 0.8 },
  ];
}
