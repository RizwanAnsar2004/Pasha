import { NextResponse } from "next/server";
import { RAG_URL, RAG_KEY } from "@/lib/ai/rag-config";

// Proxies voice questions to the PASHA RAG service's /query/voice endpoint:
// the clip is transcribed there and answered by the same guarded pipeline as
// typed questions. Mirrors /api/chat's error contract so the widget can share
// one failure path.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Matches the RAG service's MAX_AUDIO_BYTES default — rejecting here saves the
// upstream round trip for a clip that would be refused anyway.
const MAX_AUDIO_BYTES = 10_000_000;

// "in about 20 minutes" / "in a few seconds" — for the rate-limit message.
function humanizeWait(seconds: number): string {
  if (seconds <= 60) return "in less than a minute";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `in about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.ceil(mins / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

export async function POST(req: Request) {
  // Same request-id scheme as /api/chat: one id ties together our log, the RAG
  // service's log, and what the user sees.
  const requestId = crypto.randomUUID();

  const json = (data: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(
      { ...data, requestId },
      { ...init, headers: { ...init?.headers, "x-request-id": requestId } }
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: "An audio recording is required." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return json(
      { error: "That recording is too long. Please keep it under a minute." },
      { status: 413 }
    );
  }

  // The browser's per-tab session id — the RAG service's rate-limit bucket.
  // Only accepted in UUID form, same as /api/chat.
  const rawSession = form.get("sessionId");
  const sessionId =
    typeof rawSession === "string" && UUID_RE.test(rawSession.trim())
      ? rawSession.trim()
      : "";

  // Pass the real client IP through so the RAG service's fallback bucket
  // doesn't lump every visitor behind this server together.
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";

  const upstream = new FormData();
  upstream.append("audio", audio, audio.name || "question.webm");
  upstream.append("request_id", requestId);
  if (sessionId) upstream.append("session_id", sessionId);

  try {
    const res = await fetch(`${RAG_URL}/query/voice`, {
      method: "POST",
      headers: {
        ...(RAG_KEY ? { "x-api-key": RAG_KEY } : {}),
        ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      },
      body: upstream,
      // Transcription runs before generation, so allow more than /api/chat.
      signal: AbortSignal.timeout(45_000),
    });

    // Surface an upstream rate limit as a limit, not a service failure.
    if (res.status === 429) {
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
        { error: "PAi isn't available right now. Please contact startups@pasha.org.pk if this continues." },
        { status: 503 }
      );
    }

    if (res.status === 413) {
      return json(
        { error: "That recording is too long. Please keep it under a minute." },
        { status: 413 }
      );
    }

    if (!res.ok) {
      return json(
        {
          error:
            res.status >= 500
              ? "PAi couldn't hear that one. Please try recording again."
              : "PAi couldn't handle that recording. Please try again.",
        },
        { status: res.status >= 500 ? 503 : 400 }
      );
    }

    const data = await res.json();
    return json({
      answer: data.answer ?? "",
      transcription: data.transcription ?? "",
      grounded: data.grounded ?? false,
      refused: data.refused ?? false,
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return json(
      {
        error: timedOut
          ? "PAi took too long to answer that one. Please try again with a shorter question."
          : "PAi is offline at the moment. Please try again in a few minutes.",
      },
      { status: timedOut ? 504 : 503 }
    );
  }
}
