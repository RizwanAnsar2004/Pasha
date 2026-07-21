// Connection details for the P@SHA RAG service, resolved once so the read path

// Base URL of the RAG service, without a trailing slash.
export const RAG_URL = (
  process.env.RAG_API_URL ??
  process.env.RAG_SERVICE_URL ??
  "https://pasha-rag.hostinger.bitscollision.net"
).replace(/\/+$/, "");

// Shared secret. Empty when the RAG service runs without SERVICE_API_KEY set.
export const RAG_KEY =
  process.env.RAG_API_KEY ?? process.env.RAG_SERVICE_API_KEY ?? "";
