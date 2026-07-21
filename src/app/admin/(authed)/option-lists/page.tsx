import { getAdminOptionTypes } from "@/lib/options/admin.server";
import { OptionListsClient } from "./OptionListsClient";
import { parsePagination } from "@/lib/utils/pagination";

// Admin manager for reusable option lists.
export const dynamic = "force-dynamic";

export default async function OptionListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const all = await getAdminOptionTypes();
  const pagination = parsePagination(sp, { defaultPageSize: 25 });
  const rows = all.slice(pagination.from, pagination.to + 1);

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-pasha-ink">Option lists</h1>
        <p className="mt-1 text-sm text-pasha-muted">
          Reusable choice lists for dropdown / radio / checkbox fields. Saving a list
          writes to the options table and re-links existing records — changes go live
          immediately. Removing an option hides it from new entries; records already
          using it keep their label.
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
