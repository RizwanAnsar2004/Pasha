import { getOptionListsForAdmin } from "@/lib/option-lists.server";
import { OptionListsClient } from "./OptionListsClient";

// Admin manager for reusable option lists. Auth enforced by the (authed) layout.
export const dynamic = "force-dynamic";

export default async function OptionListsPage() {
  const lists = await getOptionListsForAdmin();
  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-pasha-ink">Option lists</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Reusable choice lists for dropdown / radio / checkbox fields. Reference a
          list from a field by its name in the form builder. Built-in lists can be
          overridden here without a deploy — changes go live immediately.
        </p>
      </div>
      <OptionListsClient initial={lists} />
    </div>
  );
}
