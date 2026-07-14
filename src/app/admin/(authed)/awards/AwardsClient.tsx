"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, Pencil, Plus, Search, Trash2, Trophy, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useConfirm } from "@/components/ui/useConfirm";
import { Pagination } from "../_components/Pagination";
import { useListNav } from "../_components/useListNav";
import { ShimmerOverlay } from "../_components/ShimmerOverlay";
import type { AwardRow } from "@/lib/awards.server";

type Candidate = {
  id: string;
  startup_name: string | null;
  primary_industry?: string | null;
  city?: string | null;
  pasha_verified?: boolean | null;
};

type SourceFilter = "all" | "submission" | "manual";

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/awards", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function AwardsClient({
  initial,
  total,
  page,
  pageSize,
  filters,
}: {
  initial: AwardRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; source: string };
}) {
  const router = useRouter();
  const { isPending, setParams } = useListNav();
  const { confirm, confirmDialog } = useConfirm();

  const [entries, setEntries] = useState<AwardRow[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setEntries(initial);
  }

  // Server-driven search + source filter.
  const sourceFilter = (filters.source || "all") as SourceFilter;
  const setSourceFilter = (v: SourceFilter) =>
    setParams({ source: v === "all" ? null : v, page: 1 });
  const [listQ, setListQ] = useState(filters.q);
  useEffect(() => {
    if (listQ === filters.q) return;
    const t = setTimeout(() => setParams({ q: listQ || null, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [listQ, filters.q, setParams]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Add/edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AwardRow | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [searching, setSearching] = useState(false);

  // Portal target + body scroll lock while the modal is open.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showModal]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
    setSearch("");
    setCandidates([]);
    setSelectedId(null);
    setTitle("");
    setYear("");
    setDescription("");
    setMsg(null);
  };

  const openEdit = (entry: AwardRow) => {
    setEditing(entry);
    setShowModal(true);
    setSearch(entry.startup_name ?? "");
    setCandidates(
      entry.startup_name
        ? [{ id: entry.databank_id, startup_name: entry.startup_name }]
        : []
    );
    setSelectedId(entry.databank_id);
    setTitle(entry.title);
    setYear(entry.year != null ? String(entry.year) : "");
    setDescription(entry.description ?? "");
    setMsg(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSearch("");
    setCandidates([]);
    setSelectedId(null);
    setMsg(null);
  };

  const searchStartups = async (value: string) => {
    setSearch(value);
    // Typing invalidates any previous selection and re-opens the results list.
    setSelectedId(null);
    if (value.trim().length < 1) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/awards?q=${encodeURIComponent(value.trim())}`, {
        cache: "no-store",
      });
      const j = await res.json();
      setCandidates(j.candidates ?? []);
    } finally {
      setSearching(false);
    }
  };

  const saveEntry = () =>
    run(async () => {
      if (!selectedId || !title.trim()) {
        throw new Error("Select a startup and enter an award title");
      }
      if (year.trim() && (year.trim().length !== 4 || Number(year) < 1900 || Number(year) > 2100)) {
        throw new Error("Enter a valid 4-digit year (1900–2100), or leave it blank");
      }
      const body = {
        databank_id: selectedId,
        title: title.trim(),
        year: year.trim() || undefined,
        description: description.trim() || null,
      };
      if (editing) {
        await api("PATCH", { id: editing.id, ...body });
      } else {
        await api("POST", body);
      }
      closeModal();
      router.refresh();
    });

  const removeEntry = (entry: AwardRow) =>
    run(async () => {
      const ok = await confirm({
        title: `Remove ${entry.title} from ${entry.startup_name ?? "this startup"}?`,
        confirmLabel: "Remove",
      });
      if (!ok) return;
      await api("DELETE", { id: entry.id });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      router.refresh();
    });

  // Group awards under their startup (preserving order) so a startup with
  // several awards shows as one card with all of them listed.
  type Group = {
    databank_id: string;
    startup_name: string | null;
    primary_industry: string | null;
    city: string | null;
    pasha_verified: boolean | null;
    awards: AwardRow[];
  };
  const groupedEntries: Group[] = [];
  const groupIndex = new Map<string, number>();
  for (const e of entries) {
    const at = groupIndex.get(e.databank_id);
    if (at === undefined) {
      groupIndex.set(e.databank_id, groupedEntries.length);
      groupedEntries.push({
        databank_id: e.databank_id,
        startup_name: e.startup_name,
        primary_industry: e.primary_industry,
        city: e.city,
        pasha_verified: e.pasha_verified,
        awards: [e],
      });
    } else {
      groupedEntries[at].awards.push(e);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">Award Winners</h1>
          <p className="mt-1 text-sm text-pasha-muted max-w-2xl">
            Curate the awards shown in the homepage “Award-Winning Startups” section. Add an
            award to any Data Bank startup; remove it to take it down.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pasha-red px-5 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Award
          </button>
        </div>
      </div>

      {/* Page-level error (list actions) — modal errors render inside the modal. */}
      {msg && !showModal && (
        <p className="text-sm text-pasha-red rounded-lg border border-pasha-red/30 bg-pasha-red/4 px-4 py-3">
          {msg}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted" />
          <input
            value={listQ}
            onChange={(e) => setListQ(e.target.value)}
            placeholder="Search by startup name…"
            className="h-10 w-full rounded-lg border border-pasha-line bg-white pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              { v: "all", label: "All" },
              { v: "submission", label: "From applications" },
              { v: "manual", label: "Manually added" },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setSourceFilter(f.v)}
              className={cn(
                "h-10 shrink-0 rounded-lg px-3.5 text-xs font-medium border transition-colors",
                sourceFilter === f.v
                  ? "border-pasha-ink bg-pasha-ink text-white"
                  : "border-pasha-line bg-white text-pasha-muted hover:text-pasha-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white shadow-sm overflow-hidden relative">
        <ShimmerOverlay active={isPending} />
        <div className="border-b border-pasha-line px-6 py-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h2 className="text-base font-semibold text-pasha-ink">Awards</h2>
          <span className="text-sm text-pasha-muted">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-pasha-muted">No awards found.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-3 text-sm font-medium text-pasha-red hover:text-pasha-red-dark"
            >
              Add the first award
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-pasha-line">
            {groupedEntries.map((group) => (
              <li key={group.databank_id} className="flex flex-col gap-3 px-6 py-5">
                {/* Startup header */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-pasha-red text-white text-sm font-semibold grid place-items-center shrink-0">
                    {initials(group.startup_name ?? undefined)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-pasha-ink truncate">
                        {group.startup_name ?? "Unknown"}
                      </h3>
                      {group.pasha_verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      <span className="text-[10px] text-pasha-muted">
                        {group.awards.length} {group.awards.length === 1 ? "award" : "awards"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-pasha-muted truncate">
                      {[group.primary_industry, group.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                {/* Awards for this startup */}
                <div className="ml-0 sm:ml-14 space-y-2">
                  {group.awards.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-pasha-line/70 bg-pasha-stone/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span className="text-sm text-pasha-ink truncate">
                            {entry.title}
                            {entry.year ? ` · ${entry.year}` : ""}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              entry.source === "manual"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-pasha-stone text-pasha-muted"
                            )}
                          >
                            {entry.source === "manual" ? "Manual" : "From application"}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="mt-1 pl-[22px] text-xs text-pasha-muted line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100"
                          aria-label="Edit award"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry)}
                          disabled={busy}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          aria-label="Remove award"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          setParams={setParams}
          isPending={isPending}
        />
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {showModal && (
              <>
                <motion.button
                  key="award-backdrop"
                  type="button"
                  aria-label="Close dialog"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={closeModal}
                  className="fixed inset-0 z-[100] bg-pasha-ink/40 backdrop-blur-sm"
                />
                <motion.div
                  key="award-dialog"
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-auto w-full max-w-lg rounded-2xl border border-pasha-line bg-white p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-pasha-ink">
                        {editing ? "Edit award" : "Add award"}
                      </h3>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-pasha-muted hover:text-pasha-ink"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {msg && (
                      <p className="mt-4 text-sm text-pasha-red rounded-lg border border-pasha-red/30 bg-pasha-red/4 px-3 py-2">
                        {msg}
                      </p>
                    )}

                    <label className="mt-5 block text-sm text-pasha-ink">
                      Search startup
                      <div className="relative mt-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted" />
                        <input
                          value={search}
                          onChange={(e) => searchStartups(e.target.value)}
                          placeholder="Type startup name…"
                          className="w-full h-10 rounded-lg border border-pasha-line bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-pasha-red focus:ring-2 focus:ring-pasha-red/10"
                        />
                      </div>
                    </label>

                    {(searching || (search.trim().length > 0 && !selectedId)) && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-pasha-line divide-y divide-pasha-line">
                      {searching && (
                        <div className="px-3 py-4 text-sm text-pasha-muted flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Searching…
                        </div>
                      )}
                      {!searching && candidates.length === 0 && (
                        <p className="px-3 py-4 text-sm text-pasha-muted">
                          No startups found — try a different name
                        </p>
                      )}
                      {candidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(c.id);
                            setSearch(c.startup_name ?? "");
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-sm hover:bg-pasha-stone/50 transition-colors",
                            selectedId === c.id && "bg-pasha-red/5 text-pasha-red"
                          )}
                        >
                          <span className="font-medium">{c.startup_name}</span>
                          <span className="text-xs text-pasha-muted ml-2">
                            {[c.primary_industry, c.city].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      ))}
                    </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="block text-sm text-pasha-ink">
                        Award title <span className="text-pasha-red">*</span>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Winner — National Tech Awards"
                          className="mt-1.5 block w-full h-10 rounded-lg border border-pasha-line px-3 text-sm focus:outline-none focus:border-pasha-red"
                        />
                      </label>
                      <label className="block text-sm text-pasha-ink">
                        Year
                        <input
                          value={year}
                          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          inputMode="numeric"
                          placeholder="2024"
                          className="mt-1.5 block w-full sm:w-28 h-10 rounded-lg border border-pasha-line px-3 text-sm focus:outline-none focus:border-pasha-red"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm text-pasha-ink">
                      Description
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                        rows={3}
                        maxLength={300}
                        placeholder="What it was awarded for (optional)…"
                        className="mt-1.5 block w-full resize-y rounded-lg border border-pasha-line px-3 py-2 text-sm focus:outline-none focus:border-pasha-red"
                      />
                      <span className="mt-1 block text-right text-[11px] text-pasha-muted">
                        {description.length}/300
                      </span>
                    </label>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy || !selectedId || !title.trim()}
                        onClick={saveEntry}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-5 py-2.5 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editing ? "Save changes" : "Add award"}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-lg border border-pasha-line px-5 py-2.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      {confirmDialog}
    </div>
  );
}
