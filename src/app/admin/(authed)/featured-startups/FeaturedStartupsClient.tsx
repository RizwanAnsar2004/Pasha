"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import {
  BadgeCheck,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";

type DatabankSummary = {
  id: string;
  startup_name: string;
  tagline?: string | null;
  primary_industry?: string | null;
  city?: string | null;
  logo_url?: string | null;
  pasha_verified?: boolean | null;
  product_stage?: string | null;
  incubation_stage?: string | null;
  female_employees?: number | null;
  total_employees?: number | null;
};

export type FeaturedEntry = {
  id: string;
  featured_from: string;
  featured_until: string;
  created_at: string;
  databank: DatabankSummary | DatabankSummary[] | null;
};

type Settings = {
  auto_rotate: boolean;
  show_on_homepage: boolean;
  show_on_directory: boolean;
  show_in_search: boolean;
};

type Candidate = {
  id: string;
  startup_name: string;
  primary_industry?: string | null;
  city?: string | null;
  product_stage?: string | null;
  pasha_verified?: boolean | null;
};

type Filter = "all" | "active" | "scheduled" | "expired";

function databankOf(entry: FeaturedEntry): DatabankSummary | null {
  if (!entry.databank) return null;
  return Array.isArray(entry.databank) ? entry.databank[0] ?? null : entry.databank;
}

function statusOf(entry: FeaturedEntry, now = new Date()): Filter {
  const from = new Date(entry.featured_from);
  const until = new Date(entry.featured_until);
  if (until < now) return "expired";
  if (from > now) return "scheduled";
  return "active";
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

function endOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

function startOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000`).toISOString();
}

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/featured-startups", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

const STATUS_STYLES: Record<Exclude<Filter, "all">, string> = {
  active: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-sky-50 text-sky-700",
  expired: "bg-red-50 text-red-700",
};

export function FeaturedStartupsClient({
  initialFeatured,
  initialSettings,
}: {
  initialFeatured: FeaturedEntry[];
  initialSettings: Settings;
}) {
  const [entries, setEntries] = useState<FeaturedEntry[]>(initialFeatured);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [filter, setFilter] = useState<Filter>("all");
  const [listQ, setListQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FeaturedEntry | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(toDateInput(new Date().toISOString()));
  const [untilDate, setUntilDate] = useState("");
  const [searching, setSearching] = useState(false);

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

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/featured-startups", { cache: "no-store" });
    const j = await res.json();
    setEntries(j.featured ?? []);
    setSettings(j.settings ?? initialSettings);
  }, [initialSettings]);

  const filtered = useMemo(() => {
    const needle = listQ.toLowerCase().trim();
    return entries.filter((e) => {
      const status = statusOf(e);
      if (filter !== "all" && status !== filter) return false;
      if (!needle) return true;
      const db = databankOf(e);
      return [db?.startup_name, db?.primary_industry, db?.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, filter, listQ]);

  const counts = useMemo(() => {
    const c = { all: entries.length, active: 0, scheduled: 0, expired: 0 };
    entries.forEach((e) => {
      c[statusOf(e)] += 1;
    });
    return c;
  }, [entries]);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
    setSearch("");
    setCandidates([]);
    setSelectedId(null);
    setFromDate(toDateInput(new Date().toISOString()));
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setUntilDate(toDateInput(d.toISOString()));
    setMsg(null);
  };

  const openEdit = (entry: FeaturedEntry) => {
    setEditing(entry);
    setShowModal(true);
    const db = databankOf(entry);
    setSearch(db?.startup_name ?? "");
    setCandidates(db ? [{ id: db.id, startup_name: db.startup_name }] : []);
    setSelectedId(db?.id ?? null);
    setFromDate(toDateInput(entry.featured_from));
    setUntilDate(toDateInput(entry.featured_until));
    setMsg(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSearch("");
    setCandidates([]);
    setSelectedId(null);
  };

  const searchStartups = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 1) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/featured-startups?q=${encodeURIComponent(q.trim())}`,
        { cache: "no-store" }
      );
      const j = await res.json();
      setCandidates(j.candidates ?? []);
    } finally {
      setSearching(false);
    }
  };

  const saveEntry = () =>
    run(async () => {
      if (!selectedId || !untilDate) {
        throw new Error("Select a startup and end date");
      }
      if (editing) {
        await api("PATCH", {
          id: editing.id,
          databank_id: selectedId,
          featured_from: startOfDayIso(fromDate),
          featured_until: endOfDayIso(untilDate),
        });
      } else {
        await api("POST", {
          databank_id: selectedId,
          featured_from: startOfDayIso(fromDate),
          featured_until: endOfDayIso(untilDate),
        });
      }
      await refresh();
      closeModal();
    });

  const removeEntry = (entry: FeaturedEntry) =>
    run(async () => {
      const db = databankOf(entry);
      if (!confirm(`Remove ${db?.startup_name ?? "this startup"} from featured?`)) return;
      await api("DELETE", { id: entry.id });
      await refresh();
    });

  const updateSetting = (key: keyof Settings, value: boolean) =>
    run(async () => {
      setSettings((s) => ({ ...s, [key]: value }));
      const { settings: saved } = await api("PATCH", { [key]: value });
      setSettings(saved);
    });

  const exportCSV = () => {
    const lines = [
      "startup,industry,city,featured_from,featured_until,status",
      ...entries.map((e) => {
        const db = databankOf(e);
        return [
          db?.startup_name ?? "",
          db?.primary_industry ?? "",
          db?.city ?? "",
          e.featured_from,
          e.featured_until,
          statusOf(e),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `featured-startups-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-pasha-ink">Featured Startups</h1>
          <p className="mt-1 text-sm text-pasha-muted max-w-2xl">
            Manage which startups are featured on the homepage, directory, and search.
            Each entry is active only between its start and end dates.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            disabled={entries.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-pasha-line bg-white px-3.5 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pasha-red px-5 text-sm font-medium text-white hover:bg-pasha-red-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Featured
          </button>
        </div>
      </div>

      {msg && (
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
            placeholder="Search featured startups…"
            className="h-10 w-full rounded-lg border border-pasha-line bg-white pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              { v: "all", label: `All (${counts.all})` },
              { v: "active", label: `Active (${counts.active})` },
              { v: "scheduled", label: `Scheduled (${counts.scheduled})` },
              { v: "expired", label: `Expired (${counts.expired})` },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              className={cn(
                "h-10 shrink-0 rounded-lg px-3.5 text-xs font-medium border transition-colors",
                filter === f.v
                  ? "border-pasha-ink bg-pasha-ink text-white"
                  : "border-pasha-line bg-white text-pasha-muted hover:text-pasha-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white shadow-sm overflow-hidden">
        <div className="border-b border-pasha-line px-6 py-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h2 className="text-base font-semibold text-pasha-ink">Featured list</h2>
          <span className="text-sm text-pasha-muted">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-pasha-muted">No featured startups yet.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-3 text-sm font-medium text-pasha-red hover:text-pasha-red-dark"
            >
              Add the first featured startup
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-pasha-line">
            {filtered.map((entry) => {
              const db = databankOf(entry);
              const status = statusOf(entry);
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-11 w-11 rounded-xl bg-pasha-red text-white text-sm font-semibold grid place-items-center shrink-0">
                      {initials(db?.startup_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-pasha-ink truncate">
                          {db?.startup_name ?? "Unknown"}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            STATUS_STYLES[status]
                          )}
                        >
                          {status}
                        </span>
                        {db?.pasha_verified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <BadgeCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-pasha-muted truncate">
                        {[db?.primary_industry, db?.city].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="mt-1 text-xs text-pasha-muted">
                        {format(new Date(entry.featured_from), "MMM d, yyyy")}
                        {" – "}
                        {format(new Date(entry.featured_until), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100"
                      aria-label="Edit featured entry"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry)}
                      disabled={busy}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      aria-label="Remove featured entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <section className="rounded-2xl border border-pasha-line bg-white p-6">
        <h2 className="text-base font-semibold text-pasha-ink">Featured Settings</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SettingToggle
            label="Auto-rotate featured startups"
            checked={settings.auto_rotate}
            disabled={busy}
            onChange={(v) => updateSetting("auto_rotate", v)}
          />
          <SettingToggle
            label="Show on homepage"
            checked={settings.show_on_homepage}
            disabled={busy}
            onChange={(v) => updateSetting("show_on_homepage", v)}
          />
          <SettingToggle
            label="Show on startup directory"
            checked={settings.show_on_directory}
            disabled={busy}
            onChange={(v) => updateSetting("show_on_directory", v)}
          />
          <SettingToggle
            label="Show in search results"
            checked={settings.show_in_search}
            disabled={busy}
            onChange={(v) => updateSetting("show_in_search", v)}
          />
        </div>
      </section>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.button
              key="featured-backdrop"
              type="button"
              aria-label="Close dialog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
              className="fixed inset-0 z-50 bg-pasha-ink/40 backdrop-blur-sm"
            />
            <motion.div
              key="featured-dialog"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
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
                {editing ? "Edit featured startup" : "Add featured startup"}
              </h3>
              <button type="button" onClick={closeModal} className="text-pasha-muted hover:text-pasha-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-pasha-line divide-y divide-pasha-line">
              {searching && (
                <div className="px-3 py-4 text-sm text-pasha-muted flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </div>
              )}
              {!searching && candidates.length === 0 && (
                <p className="px-3 py-4 text-sm text-pasha-muted">Search for a databank startup</p>
              )}
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
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

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-pasha-ink">
                Featured from
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-lg border border-pasha-line px-3 text-sm focus:outline-none focus:border-pasha-red"
                />
              </label>
              <label className="block text-sm text-pasha-ink">
                Featured until <span className="text-pasha-red">*</span>
                <input
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  required
                  className="mt-1.5 w-full h-10 rounded-lg border border-pasha-line px-3 text-sm focus:outline-none focus:border-pasha-red"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !selectedId || !untilDate}
                onClick={saveEntry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-pasha-red px-5 py-2.5 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Save changes" : "Add featured"}
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
      </AnimatePresence>
    </div>
  );
}

function SettingToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-pasha-line px-4 py-3 cursor-pointer hover:bg-pasha-stone/30">
      <span className="text-sm text-pasha-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-pasha-red" : "bg-pasha-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}
