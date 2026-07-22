// The members' group, not the public PASHA page — the header, footer and JoinCommunity
// links all read "community", so they must land people somewhere they can actually join.
export const PASHA_FACEBOOK = "https://www.facebook.com/groups/pashacommunity";

// Official public accounts. Distinct from PASHA_FACEBOOK above: these are the
// association's broadcast channels, not the members' group.
export const PASHA_FACEBOOK_PAGE = "https://www.facebook.com/pakict";
export const PASHA_TWITTER = "https://x.com/PASHAORG";
export const PASHA_INSTAGRAM = "https://www.instagram.com/pasha.org.pk";
export const PASHA_YOUTUBE = "https://www.youtube.com/@pakict";
export const PASHA_LINKEDIN = "https://www.linkedin.com/company/pashapk";

// Follow row on the footer and /contact, in display order.
export const PASHA_SOCIALS: {
  key: "facebook" | "twitter" | "instagram" | "youtube" | "linkedin";
  label: string;
  url: string;
}[] = [
  { key: "facebook", label: "Facebook", url: PASHA_FACEBOOK_PAGE },
  { key: "twitter", label: "X (Twitter)", url: PASHA_TWITTER },
  { key: "instagram", label: "Instagram", url: PASHA_INSTAGRAM },
  { key: "youtube", label: "YouTube", url: PASHA_YOUTUBE },
  { key: "linkedin", label: "LinkedIn", url: PASHA_LINKEDIN },
];
