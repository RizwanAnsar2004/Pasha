import { NextResponse } from "next/server";

// Proxies chat questions to the P@SHA RAG service. Keeping this server-side keeps
// the RAG service key off the client and avoids CORS.
const RAG_URL =
  process.env.RAG_API_URL ?? "https://pasha-rag.hostinger.bitscollision.net";
const RAG_KEY = process.env.RAG_API_KEY; // only needed if the RAG service sets SERVICE_API_KEY

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

    if (!res.ok) {
      return NextResponse.json(
        { error: `RAG service error (${res.status}).` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      answer: data.answer ?? "",
      grounded: data.grounded ?? false,
      refused: data.refused ?? false,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the assistant. Please try again." },
      { status: 502 }
    );
  }
}
