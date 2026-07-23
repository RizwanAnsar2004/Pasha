import { NextResponse } from "next/server";
import { RAG_URL, RAG_KEY } from "@/lib/ai/rag-config";

// Proxies chat questions to the PASHA RAG service (Kai).

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// "in about 20 minutes" / "in a few seconds" — for the rate-limit message.
function humanizeWait(seconds: number): string {
  if (seconds <= 60) return "in less than a minute";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `in about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.ceil(mins / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

export async function POST(req: Request) {
  // One id per query, minted here so the same value ties together our log, the
  // RAG service's log, and whatever the user sees — someone reporting a bad or
  // failed answer can quote it instead of describing the question.
  //
  // Travels upstream in the request body alongside the question, never as a
  // header: proxies and gateways in front of the RAG service can drop or
  // rewrite custom headers, and the body is the payload it already parses.
  const requestId = crypto.randomUUID();

  // Every response carries the id, both as a header (for tooling) and in the
  // body (for the client), including the failure paths.
  const json = (data: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(
      { ...data, requestId },
      { ...init, headers: { ...init?.headers, "x-request-id": requestId } }
    );

  let body: { question?: unknown; top_k?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return json({ error: "Question is required." }, { status: 400 });
  }

  // The browser's per-tab session id — the RAG service's rate-limit bucket.
  // Only accepted in UUID form: it becomes a key in the limiter's store, so a
  // caller must not be able to make that key arbitrary or unbounded.
  const sessionId =
    typeof body.sessionId === "string" && UUID_RE.test(body.sessionId.trim())
      ? body.sessionId.trim()
      : "";

  // The RAG service falls back to the caller's IP when there's no session id,
  // but it sees this server, not the visitor — so pass the real client through.
  // Without it every visitor shares a single bucket.
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";

  try {
    const res = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(RAG_KEY ? { "x-api-key": RAG_KEY } : {}),
        ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      },
      body: JSON.stringify({
        question,
        top_k: typeof body.top_k === "number" ? body.top_k : 5,
        request_id: requestId,
        ...(sessionId ? { session_id: sessionId } : {}),
      }),
      // RAG generation can take a few seconds.
      signal: AbortSignal.timeout(30_000),
    });

    // Surface an upstream rate limit as a limit, not a service failure.
    if (res.status === 429) {
      // The service sends Retry-After in seconds. The fallback only applies if
      // it's missing, and it has to be small: the limit is per-minute, so
      // guessing an hour would lock a user out ~60x longer than the actual
      // cooldown.
      const retryAfter = Number(res.headers.get("retry-after")) || 60;
      return json(
        {
          error:
            `You've reached the question limit for now. You can ask again ${humanizeWait(retryAfter)}.`,
          retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Key missing or rejected — our misconfiguration, not the user's fault.
    if (res.status === 401 || res.status === 403) {
      return json(
        { error: "Kai isn't available right now. Please contact startups@pasha.org.pk if this continues." },
        { status: 503 }
      );
    }

    if (!res.ok) {
      return json(
        {
          error:
            res.status >= 500
              ? "Kai is temporarily offline while the service restarts. Please try again in a few minutes."
              : "Kai couldn't handle that request. Please try rephrasing your question.",
        },
        { status: res.status >= 500 ? 503 : 400 }
      );
    }

    const data = await res.json();
    return json({
      answer: data.answer ?? "",
      grounded: data.grounded ?? false,
      refused: data.refused ?? false,
    });
  } catch (e) {
    // "Took too long" and "couldn't connect" need different advice.
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return json(
      {
        error: timedOut
          ? "Kai took too long to answer that one. Please try again, or ask something more specific."
          : "Kai is offline at the moment. Please try again in a few minutes.",
      },
      { status: timedOut ? 504 : 503 }
    );
  }
}
