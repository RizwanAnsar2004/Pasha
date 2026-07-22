import { NextResponse } from "next/server";
import { RAG_URL, RAG_KEY } from "@/lib/ai/rag-config";

// Proxies chat questions to the PASHA RAG service (Kai).

// "in about 20 minutes" / "in a few seconds" — for the rate-limit message.
function humanizeWait(seconds: number): string {
  if (seconds <= 60) return "in less than a minute";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `in about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.ceil(mins / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

export async function POST(req: Request) {
  let body: { question?: unknown; top_k?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  try {
    const res = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(RAG_KEY ? { "x-api-key": RAG_KEY } : {}),
      },
      body: JSON.stringify({
        question,
        top_k: typeof body.top_k === "number" ? body.top_k : 5,
      }),
      // RAG generation can take a few seconds.
      signal: AbortSignal.timeout(30_000),
    });

    // Surface an upstream rate limit as a limit, not a service failure.
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 3600;
      return NextResponse.json(
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
      return NextResponse.json(
        { error: "Kai isn't available right now. Please contact startups@pasha.org.pk if this continues." },
        { status: 503 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
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
    return NextResponse.json({
      answer: data.answer ?? "",
      grounded: data.grounded ?? false,
      refused: data.refused ?? false,
    });
  } catch (e) {
    // "Took too long" and "couldn't connect" need different advice.
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return NextResponse.json(
      {
        error: timedOut
          ? "Kai took too long to answer that one. Please try again, or ask something more specific."
          : "Kai is offline at the moment. Please try again in a few minutes.",
      },
      { status: timedOut ? 504 : 503 }
    );
  }
}
