import { redirect } from "next/navigation";

// The application form used to live at its own route.
export default async function ApplicantFormPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;
  const query = step != null ? `&step=${encodeURIComponent(step)}` : "";
  redirect(`/apply?tab=form${query}`);
}
