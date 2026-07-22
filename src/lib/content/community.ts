// The members' group, not the public P@SHA page — the header, footer and JoinCommunity
// links all read "community", so they must land people somewhere they can actually join.
export const PASHA_FACEBOOK = "https://www.facebook.com/groups/pashacommunity";

export const PASHA_LINKEDIN = "https://www.linkedin.com/company/pashapk/";
// Fill these in to make the matching footer icon appear — an empty url is skipped
// rather than rendered as a dead link.
export const PASHA_TWITTER = "";
export const PASHA_YOUTUBE = "";

// Follow row in the footer, in display order.
export const PASHA_SOCIALS: { key: "facebook" | "twitter" | "youtube" | "linkedin"; label: string; url: string }[] = [
  { key: "facebook", label: "Facebook", url: PASHA_FACEBOOK },
  { key: "twitter", label: "X (Twitter)", url: PASHA_TWITTER },
  { key: "youtube", label: "YouTube", url: PASHA_YOUTUBE },
  { key: "linkedin", label: "LinkedIn", url: PASHA_LINKEDIN },
];
