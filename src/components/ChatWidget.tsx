"use client";
import { api, ApiError } from "@/lib/api/client";

// Floating chat widget wired to Kai, the PASHA RAG assistant (/api/chat).

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Message = { id: number; role: "user" | "bot"; text: string };

const STORAGE_KEY = "pasha-chat-history";

const GREETING: Message = {
  id: 0,
  role: "bot",
  text: "Hi! 👋 I'm Kai, the PASHA assistant. Ask me anything about the community, the application, or the directory.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Epoch ms until which the rate limit blocks sending; 0 = not limited.
  const [limitedUntil, setLimitedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // Load saved conversation from localStorage on first mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Message[];
        if (Array.isArray(saved) && saved.length) {
          setMessages(saved);
          nextId.current = Math.max(...saved.map((m) => m.id)) + 1;
        }
      }
    } catch {
      // Ignore corrupt storage and start fresh.
    }
  }, []);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full / unavailable — non-fatal.
    }
  }, [messages]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const clearChat = () => {
    setMessages([GREETING]);
    nextId.current = 1;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Ticks once a second only while a cooldown is active, so the countdown stays live.
  useEffect(() => {
    if (!limitedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [limitedUntil]);

  const secondsLeft = limitedUntil ? Math.max(0, Math.ceil((limitedUntil - now) / 1000)) : 0;
  const rateLimited = secondsLeft > 0;

  // mm:ss while under an hour, else a rounded hour count.
  const cooldownLabel = secondsLeft >= 3600
    ? `${Math.ceil(secondsLeft / 3600)}h`
    : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const send = async () => {
    const text = input.trim();
    if (!text || loading || rateLimited) return;
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.post<{ answer?: string }>("/api/chat", { question: text });
      const botText = data.answer ?? "Sorry, something went wrong. Please try again.";
      setMessages((m) => [...m, { id: nextId.current++, role: "bot", text: botText }]);
    } catch (e) {
      // A 429 is a quota message, not a failure — lock the composer.
      if (e instanceof ApiError && e.status === 429) {
        const retryAfter = typeof e.data.retryAfter === "number" ? e.data.retryAfter : 3600;
        setNow(Date.now());
        setLimitedUntil(Date.now() + retryAfter * 1000);
      }
      const botText = e instanceof ApiError ? e.message : "Kai is offline at the moment. Please try again in a few minutes.";
      setMessages((m) => [...m, { id: nextId.current++, role: "bot", text: botText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-[60] flex h-[28rem] max-h-[calc(100dvh-7rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10"
          role="dialog"
          aria-label="Kai"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-pasha-red px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Kai</p>
                <p className="text-[11px] text-white/70">Typically replies in a few minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg px-2 py-1 text-[11px] text-white/80 hover:bg-white/15 hover:text-white"
                aria-label="Clear chat history"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-pasha-red px-3.5 py-2 text-sm text-white"
                      : "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-400">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={rateLimited ? `Question limit reached — try again in ${cooldownLabel}` : "Type a message…"}
              disabled={loading || rateLimited}
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-pasha-red focus:outline-none focus:ring-2 focus:ring-pasha-red/10 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || loading || rateLimited}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pasha-red text-white hover:bg-pasha-red-dark disabled:opacity-40"
              aria-label={rateLimited ? `Question limit reached, try again in ${cooldownLabel}` : "Send"}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Kai" : "Open Kai"}
        className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-pasha-red text-white shadow-lg shadow-pasha-red/30 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
