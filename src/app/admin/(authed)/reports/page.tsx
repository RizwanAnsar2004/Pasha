import { getFormOptionRegistry } from "@/lib/options/registry.server";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const registry = await getFormOptionRegistry();
  const sectors = (registry.SECTORS ?? []).map((o) => ({ value: o.value, label: o.label }));
  return <ReportsClient sectors={sectors} />;
}
