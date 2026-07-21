/**
 * Connection details for the P@SHA RAG service, resolved once so the read path
 * (src/app/api/chat/route.ts) and the write path (src/lib/rag-sync.ts) can
 * never point at different backends.
 *
 * RAG_SERVICE_* are legacy names kept as fallbacks for deployments whose env
 * predates the RAG_API_* rename; drop them once every environment is migrated.
 */

/** Base URL of the RAG service, without a trailing slash. */
export const RAG_URL = (
  process.env.RAG_API_URL ??
  process.env.RAG_SERVICE_URL ??
  "https://pasha-rag.hostinger.bitscollision.net"
).replace(/\/+$/, "");

/** Shared secret. Empty when the RAG service runs without SERVICE_API_KEY set. */
export const RAG_KEY =
  process.env.RAG_API_KEY ?? process.env.RAG_SERVICE_API_KEY ?? "";
