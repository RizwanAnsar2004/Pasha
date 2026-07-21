// Best-effort sync of databank changes to the pasha-rag-service, which keeps a
// ChromaDB vector store in sync for the RAG assistant.
//
// We POST only the row id + event type; the RAG service re-fetches the row from
// Supabase (its source of truth) and upserts/deletes the corresponding vector.
// This is the "app-level notify" approach (vs a Supabase DB webhook) so the RAG
// service URL lives in one env var here and can change freely.
//
// Fire-and-forget via next/server `after()`: it never blocks or fails the admin
// request. To make ingestion reliable on *every* approve/edit, the POST retries
// with backoff on a transient failure; if it still can't reach the service, the
// failure is logged loudly and the service's own `POST /databank/sync` (full
// backfill + reconcile) is the safety net.

import { after } from "next/server";
import { RAG_URL, RAG_KEY } from "@/lib/rag-config";

// Retry the notify a few times before giving up — covers a brief restart or
// network blip so an approval isn't silently dropped from the RAG store.
const RAG_SYNC_MAX_ATTEMPTS = 4;
const RAG_SYNC_BACKOFF_MS = [500, 2000, 5000]; // delay before attempts 2,3,4

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RagEventType = "INSERT" | "UPDATE" | "DELETE";

/**
 * Perform the actual notify POST to the RAG service, with bounded retries.
 * Returns true once the service acknowledges (HTTP 2xx), false if it gave up.
 * Extracted from `notifyRagDatabank` so the network behaviour is directly
 * testable without a request context (the `after()` wrapper needs one).
 */
export async function sendDatabankEvent(
  type: RagEventType,
  id: string
): Promise<boolean> {
  if (!RAG_URL || !id) return false;

  // Matches the DatabankEvent shape the RAG service parses. Only the id is
  // sent — content is pulled server-side from Supabase (source of truth).
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

/**
 * Notify the RAG service that a databank row changed. Schedules the POST after
 * the response is sent; safe to call from any admin route handler.
 */
export function notifyRagDatabank(type: RagEventType, id: string): void {
  if (!RAG_URL || !id) return;
  after(() => sendDatabankEvent(type, id));
}
