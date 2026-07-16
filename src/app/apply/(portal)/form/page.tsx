import { redirect } from "next/navigation";

// The application form used to live at its own route. It's now a client tab on
// the portal overview (/apply) so switching between "Overview" and "My
// application" is instant instead of a full server navigation. This route is
// kept as a redirect so old links/bookmarks (and ?step deep-links) still work.
export default async function ApplicantFormPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;
  const query = step != null ? `&step=${encodeURIComponent(step)}` : "";
  redirect(`/apply?tab=form${query}`);
}
