// Chat session identity for Kai.
//
// The RAG service rate-limits per session, so this id is the bucket key: it has
// to stay stable across a conversation, unlike the per-query request id minted
// in /api/chat for tracing. Kept in sessionStorage rather than localStorage so
// it lasts for the tab and is dropped when the tab closes.

const SESSION_KEY = "pasha-chat-session-id";

// Fallback id for browsers where sessionStorage throws (Safari private mode,
// storage blocked). Module-level so it's at least stable for the page load
// instead of minting a fresh bucket on every question.
let ephemeralSessionId: string | null = null;

// Returns the tab's chat session id, creating and persisting one on first use.
export function getChatSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    ephemeralSessionId ??= crypto.randomUUID();
    return ephemeralSessionId;
  }
}
