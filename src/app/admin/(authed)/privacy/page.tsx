import { getSiteContent } from "@/lib/site-content.server";
import { SITE_CONTENT_META } from "@/lib/site-content";
import { PrivacyContentClient } from "./PrivacyContentClient";

export const dynamic = "force-dynamic";

export default async function PrivacyContentPage() {
  const content = await getSiteContent("privacy_policy");
  return (
    <PrivacyContentClient
      slug="privacy_policy"
      meta={SITE_CONTENT_META.privacy_policy}
      initial={{ title: content.title, body: content.body, updated_at: content.updated_at }}
    />
  );
}
