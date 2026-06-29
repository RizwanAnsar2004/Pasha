import { getOptionListsForAdmin } from "@/lib/option-lists.server";
import { OptionListsClient } from "./OptionListsClient";
import { parsePagination } from "@/lib/pagination";

// Admin manager for reusable option lists. Auth enforced by the (authed) layout.
export const dynamic = "force-dynamic";

export default async function OptionListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // The list is a small, merged (code + DB) set assembled in memory, so we
  // paginate by slicing the resolved array rather than a SQL range — but the
  // page/pageSize still flow through the URL for the shared <Pagination>.
  const all = await getOptionListsForAdmin();
  const pagination = parsePagination(sp, { defaultPageSize: 25 });
  const rows = all.slice(pagination.from, pagination.to + 1);

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
      <OptionListsClient
        initial={rows}
        total={all.length}
        page={pagination.page}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}
