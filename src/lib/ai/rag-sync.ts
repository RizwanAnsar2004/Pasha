// Best-effort sync of databank changes to the pasha-rag-service, which keeps a

import { after } from "next/server";
import { RAG_URL, RAG_KEY } from "@/lib/ai/rag-config";

// Retry the notify a few times before giving up — covers a brief restart or
const RAG_SYNC_MAX_ATTEMPTS = 4;
const RAG_SYNC_BACKOFF_MS = [500, 2000, 5000]; // delay before attempts 2,3,4

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RagEventType = "INSERT" | "UPDATE" | "DELETE";

// Perform the actual notify POST to the RAG service, with bounded retries.
export async function sendDatabankEvent(
  type: RagEventType,
  id: string
): Promise<boolean> {
  if (!RAG_URL || !id) return false;

  // Matches the DatabankEvent shape the RAG service parses. Only the id is
  const body = JSON.stringify({
    type,
    table: "databank",
    record: type === "DELETE" ? null : { id },
    old_record: type === "DELETE" ? { id } : null,
  });

  for (let attempt = 1; attempt <= RAG_SYNC_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${RAG_URL}/databank/event`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(RAG_KEY ? { "x-api-key": RAG_KEY } : {}),
        },
        body,
        // Never let a hung service stall the runtime's post-response work.
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        if (attempt > 1) {
          console.log(`rag-sync ${type} ${id} ok on attempt ${attempt}`);
        }
        return true; // ingested — done
      }
      // A 4xx (bad request / auth) won't fix itself on retry; stop early.
      if (res.status >= 400 && res.status < 500) {
        console.error(`rag-sync ${type} ${id} gave up: HTTP ${res.status}`);
        return false;
      }
      console.error(
        `rag-sync ${type} ${id} attempt ${attempt}/${RAG_SYNC_MAX_ATTEMPTS} failed: HTTP ${res.status}`
      );
    } catch (e) {
      console.error(
        `rag-sync ${type} ${id} attempt ${attempt}/${RAG_SYNC_MAX_ATTEMPTS} error:`,
        e instanceof Error ? e.message : e
      );
    }
    const backoff = RAG_SYNC_BACKOFF_MS[attempt - 1];
    if (backoff != null) await sleep(backoff);
  }
  console.error(
    `rag-sync ${type} ${id} EXHAUSTED ${RAG_SYNC_MAX_ATTEMPTS} attempts — run "POST /databank/sync" to reconcile.`
  );
  return false;
}

// Notify the RAG service that a databank row changed. Schedules the POST after
export function notifyRagDatabank(type: RagEventType, id: string): void {
  if (!RAG_URL || !id) return;
  after(() => sendDatabankEvent(type, id));
}
