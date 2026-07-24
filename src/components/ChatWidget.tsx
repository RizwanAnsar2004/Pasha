"use client";
import { api, ApiError } from "@/lib/api/client";
import { getChatSessionId } from "@/lib/ai/chat-session";

// Floating chat widget wired to Kai, the PASHA RAG assistant (/api/chat).

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Mic, Square } from "lucide-react";

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
  const [recording, setRecording] = useState(false);
  // Epoch ms until which the rate limit blocks sending; 0 = not limited.
  const [limitedUntil, setLimitedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const recorderRef = useRef<MediaRecorder | null>(null);

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

  // Full-screen on mobile behaves like a modal sheet — lock background scroll
  // while it's open. The floating desktop panel doesn't need this.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
      // Created on first send and reused for the rest of the tab's session —
      // it's the key the RAG service rate-limits on.
      const data = await api.post<{ answer?: string }>("/api/chat", {
        question: text,
        sessionId: getChatSessionId(),
      });
      const botText = data.answer ?? "Sorry, something went wrong. Please try again.";
      setMessages((m) => [...m, { id: nextId.current++, role: "bot", text: botText }]);
    } catch (e) {
      failWith(e);
    } finally {
      setLoading(false);
    }
  };

  // Shared failure path for typed and voice questions.
  const failWith = (e: unknown) => {
    // A 429 is a quota message, not a failure — lock the composer.
    if (e instanceof ApiError && e.status === 429) {
      const retryAfter = typeof e.data.retryAfter === "number" ? e.data.retryAfter : 3600;
      setNow(Date.now());
      setLimitedUntil(Date.now() + retryAfter * 1000);
    }
    const botText = e instanceof ApiError ? e.message : "Kai is offline at the moment. Please try again in a few minutes.";
    setMessages((m) => [...m, { id: nextId.current++, role: "bot", text: botText }]);
  };

  const sendVoice = async (clip: Blob, mimeType: string) => {
    setLoading(true);
    try {
      const form = new FormData();
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio", new File([clip], `question.${ext}`, { type: mimeType }));
      form.append("sessionId", getChatSessionId());
      const data = await api.upload<{ answer?: string; transcription?: string }>(
        "/api/chat/voice",
        form,
      );
      // Echo the transcript back as the user's bubble so they see what was heard.
      const heard = (data.transcription ?? "").trim();
      setMessages((m) => [
        ...m,
        { id: nextId.current++, role: "user", text: heard || "🎤 Voice message" },
        {
          id: nextId.current++,
          role: "bot",
          text: data.answer ?? "Sorry, something went wrong. Please try again.",
        },
      ]);
    } catch (e) {
      failWith(e);
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (loading || rateLimited || recording) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "bot",
          text: "I couldn't access your microphone. Please allow microphone access and try again.",
        },
      ]);
      return;
    }

    // Pick the first container this browser can actually produce — Safari
    // records mp4, everyone else webm/ogg; the RAG service accepts all three.
    const mimeType =
      ["audio/webm", "audio/ogg", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const clip = new Blob(chunks, { type });
      if (clip.size > 0) sendVoice(clip, type);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  // Don't leave the mic live if the widget unmounts mid-recording. The onstop
  // handler releases the stream's tracks.
  useEffect(() => () => recorderRef.current?.stop(), []);

  // Closing the panel mid-recording stops the mic; the clip still sends, so
  // the answer is waiting in the history when the panel reopens.
  useEffect(() => {
    if (!open && recorderRef.current) stopRecording();
  }, [open]);

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl shadow-black/10 sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[28rem] sm:max-h-[calc(100dvh-7rem)] sm:w-[22rem] sm:max-w-[calc(100vw-2.5rem)] sm:rounded-2xl"
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
              placeholder={
                rateLimited
                  ? `Question limit reached — try again in ${cooldownLabel}`
                  : recording
                    ? "Listening… tap the mic to send"
                    : "Type a message…"
              }
              disabled={loading || rateLimited || recording}
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-pasha-red focus:outline-none focus:ring-2 focus:ring-pasha-red/10 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={loading || rateLimited}
              className={
                recording
                  ? "grid h-9 w-9 shrink-0 animate-pulse place-items-center rounded-full bg-pasha-red text-white"
                  : "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:border-pasha-red hover:text-pasha-red disabled:opacity-40"
              }
              aria-label={recording ? "Stop recording and send" : "Ask by voice"}
            >
              {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
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
