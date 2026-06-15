"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, CheckCircle2, XCircle, Eye, Loader2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { safeHref, safeImageSrc } from "@/lib/safe-url";

type Row = {
  id: string;
  startup_name: string | null;
  founder_name: string | null;
  founder_email: string | null;
  founder_mobile?: string | null;
  primary_sector: string | null;
  hq_city: string | null;
  stage: string | null;
  status: string | null;
  vetting_tier: string | null;
  vetting_score: number | null;
  created_at: string;
};

type FullRow = Row & Record<string, unknown>;

export function SubmissionsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "watchlist">("all");
  // Initialise from ?id= query param on mount so deep-linked submissions
  // open immediately without a cascading setState inside an effect.
  const [openId, setOpenId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("id");
  });

  // Realtime: listen for inserts/updates
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("submissions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          setRows((prev) => [payload.new as Row, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions" },
        (payload) => {
          setRows((prev) =>
            prev.map((r) => (r.id === (payload.new as Row).id ? (payload.new as Row) : r))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!needle) return true;
      return [r.startup_name, r.founder_name, r.founder_email, r.primary_sector]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pasha-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search startups, founders, sectors…"
            className="h-10 w-full rounded-lg border border-pasha-line bg-white pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { v: "all", label: "All" },
            { v: "pending", label: "Pending" },
            { v: "approved", label: "Approved" },
            { v: "watchlist", label: "Watchlist" },
            { v: "rejected", label: "Rejected" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v as typeof filter)}
              className={cn(
                "h-10 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                filter === f.v
                  ? "bg-pasha-ink text-white"
                  : "border border-pasha-line bg-white text-pasha-ink hover:bg-pasha-stone/60"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-pasha-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pasha-stone/40 border-b border-pasha-line">
              <tr className="text-left">
                <Th>Startup</Th>
                <Th>Founder</Th>
                <Th>Sector</Th>
                <Th>City</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-pasha-muted text-sm">
                    No submissions match.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-pasha-line/60 hover:bg-pasha-stone/40 cursor-pointer"
                    onClick={() => setOpenId(r.id)}
                  >
                    <Td>
                      <span className="font-medium text-pasha-ink">
                        {r.startup_name ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-pasha-ink">{r.founder_name}</span>
                        <span className="text-xs text-pasha-muted">{r.founder_email}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-pasha-muted">{r.primary_sector ?? "—"}</span>
                    </Td>
                    <Td>
                      <span className="text-pasha-muted">{r.hq_city ?? "—"}</span>
                    </Td>
                    <Td>
                      {r.vetting_tier ? (
                        <TierBadge tier={r.vetting_tier} score={r.vetting_score ?? 0} />
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status ?? "pending"} />
                    </Td>
                    <Td>
                      <span className="text-xs text-pasha-muted">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </Td>
                    <Td>
                      <Eye className="w-4 h-4 text-pasha-muted" />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {openId && <SubmissionDrawer id={openId} onClose={() => setOpenId(null)} onUpdated={(r) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...r } : x)))} />}
      </AnimatePresence>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function TierBadge({ tier, score }: { tier: string; score: number }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[1px]",
          tier === "featured" && "bg-tier-featured/10 text-tier-featured",
          tier === "listed" && "bg-tier-listed/10 text-tier-listed",
          tier === "watchlist" && "bg-tier-watchlist/10 text-tier-watchlist",
          tier === "excluded" && "bg-pasha-muted/10 text-pasha-muted"
        )}
      >
        {tier}
      </span>
      <span className="text-xs font-mono text-pasha-muted">{score}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[1px]",
        status === "pending" && "bg-pasha-stone/80 text-pasha-ink/70",
        status === "approved" && "bg-tier-featured/10 text-tier-featured",
        status === "rejected" && "bg-pasha-red/10 text-pasha-red",
        status === "watchlist" && "bg-tier-watchlist/10 text-tier-watchlist"
      )}
    >
      {status}
    </span>
  );
}

function SubmissionDrawer({
  id,
  onClose,
  onUpdated,
}: {
  id: string;
  onClose: () => void;
  onUpdated: (r: Partial<Row> & { id: string }) => void;
}) {
  const [row, setRow] = useState<FullRow | null>(null);
  const [acting, setActing] = useState<null | "approve" | "reject" | "watchlist">(null);
  // The matching databank row's id, if this submission has been approved
  // and materialised into the public directory. Powers the "Edit listing"
  // link in the drawer footer.
  const [databankId, setDatabankId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();
      if (cancel || !data) return;
      setRow(data as FullRow);

      // If approved, try to find the matching databank row. We set
      // source_id = submissions.id on approval-insert, so that's the
      // cheap lookup. If the row was already present (matched by name
      // and updated in place instead of inserted), the source_id link
      // may be absent — fall back to a name match.
      if (data.status === "approved") {
        let { data: dbk } = await supabase
          .from("databank")
          .select("id")
          .eq("source_id", String(data.id))
          .limit(1);
        if (!dbk || dbk.length === 0) {
          ({ data: dbk } = await supabase
            .from("databank")
            .select("id")
            .ilike("startup_name", String(data.startup_name))
            .limit(1));
        }
        if (!cancel && dbk && dbk[0]?.id) setDatabankId(dbk[0].id as string);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id]);

  const act = async (newStatus: "approved" | "rejected" | "watchlist") => {
    setActing(newStatus === "approved" ? "approve" : newStatus === "rejected" ? "reject" : "watchlist");
    try {
      // Use the admin API route so writes go through is_admin() check + audit log
      const res = await fetch("/api/admin/submission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        onUpdated({ id, status: newStatus });
        setRow((r) => (r ? { ...r, status: newStatus } : r));
      }
    } finally {
      setActing(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-pasha-ink/40 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-pasha-line">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted">
            Submission
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-pasha-stone/60 transition-colors"
          >
            <X className="w-4 h-4 text-pasha-muted" />
          </button>
        </div>
        {!row ? (
          <div className="flex-1 grid place-items-center text-pasha-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex items-start gap-4 mb-6">
              {row.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeImageSrc(row.logo_url as string)} alt="" className="w-16 h-16 rounded-lg border border-pasha-line object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-2xl tracking-tight text-pasha-ink truncate">
                  {row.startup_name as string}
                </h2>
                {row.website ? (
                  <a
                    href={safeHref(String(row.website).startsWith("http") ? String(row.website) : `https://${row.website}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pasha-red hover:underline mt-1 inline-block"
                  >
                    {String(row.website).replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  {row.vetting_tier ? <TierBadge tier={String(row.vetting_tier)} score={Number(row.vetting_score ?? 0)} /> : null}
                  <StatusBadge status={String(row.status ?? "pending")} />
                </div>
              </div>
            </div>

            <Section title="Description">
              <p className="text-sm text-pasha-ink leading-relaxed">
                {String(row.description ?? "—")}
              </p>
            </Section>

            {/* Founders. Prefer the v2 JSONB array; fall back to the legacy
                flat columns for pre-v2 submissions that never wrote founders. */}
            <FoundersSection row={row as Record<string, unknown>} />

            <Section title="Company socials">
              <SocialKV
                k="LinkedIn"
                v={(row as Record<string, unknown>).company_linkedin}
              />
              <SocialKV
                k="X / Twitter"
                v={(row as Record<string, unknown>).company_x}
              />
              <SocialKV
                k="Instagram"
                v={(row as Record<string, unknown>).company_instagram}
              />
              <SocialKV
                k="Facebook"
                v={(row as Record<string, unknown>).company_facebook}
              />
              <SocialKV
                k="YouTube"
                v={(row as Record<string, unknown>).company_youtube}
              />
            </Section>

            <Section title="Startup">
              <KV
                k="Location"
                v={
                  (row as Record<string, unknown>).outside_pakistan
                    ? `${String((row as Record<string, unknown>).hq_country ?? "—")} (outside Pakistan)`
                    : String(row.hq_city ?? row.hq_other ?? "—")
                }
              />
              <KV k="Stage" v={String(row.stage ?? "—")} />
              <KV k="Primary sector" v={String(row.primary_sector ?? "—")} />
              <KV k="Secondary sector" v={String((row as Record<string, unknown>).secondary_sector ?? "—")} />
              <KV k="Business model" v={String(row.business_model ?? "—")} />
              <KV
                k="Revenue model"
                v={
                  Array.isArray(row.revenue_models)
                    ? (row.revenue_models as string[]).join(", ")
                    : "—"
                }
              />
              <KV k="Year founded" v={String(row.year_founded ?? "—")} />
              <KV k="P@SHA member" v={renderYesNo(row.is_pasha_member)} />
            </Section>

            <Section title="Team & traction">
              <KV k="Founding team" v={String(row.founding_team_composition ?? "—")} />
              <KV k="Total employees" v={String(row.total_employees ?? "—")} />
              <KV k="Female employees" v={String(row.female_employees ?? "—")} />
              <KV k="Revenue band" v={String(row.revenue_band ?? "—")} />
            </Section>

            <Section title="Funding">
              <KV k="Raised funding" v={renderYesNo(row.raised_funding)} />
              <KV k="Stage" v={String(row.funding_stage ?? "—")} />
              <KV k="Currently raising" v={renderYesNo(row.currently_raising)} />
            </Section>

            <Section title="Ecosystem & IP">
              <KV
                k="NIC"
                v={
                  row.incubated_in_nic
                    ? `Yes${row.nic_name ? ` · ${row.nic_name}` : ""}`
                    : "No"
                }
              />
              <KV k="Cohort" v={String(row.nic_cohort ?? "—")} />
              <KV
                k="Patents"
                v={
                  row.has_patents
                    ? `Yes${row.patents_count ? ` · ${row.patents_count}` : ""}`
                    : "No"
                }
              />
              <KV k="FBR" v={renderYesNo(row.fbr_registered)} />
              <KV k="SECP" v={renderYesNo(row.secp_registered)} />
              <KV
                k="Engagement"
                v={
                  Array.isArray(row.engagement_interests)
                    ? (row.engagement_interests as string[]).join(", ")
                    : "—"
                }
              />
              <KV k="Awards" v={String((row as Record<string, unknown>).awards ?? "—")} />
              <KV
                k="Certifications"
                v={String((row as Record<string, unknown>).certifications ?? "—")}
              />
            </Section>

            <Section title="Files">
              {row.pitch_deck_url ? (
                <a href={safeHref(String(row.pitch_deck_url))} target="_blank" rel="noopener noreferrer" className="text-sm text-pasha-red hover:underline block">
                  → Open pitch deck
                </a>
              ) : <p className="text-sm text-pasha-muted">No pitch deck</p>}
              {row.pitch_video ? (
                <a href={safeHref(String(row.pitch_video))} target="_blank" rel="noopener noreferrer" className="text-sm text-pasha-red hover:underline block mt-1.5">
                  → Pitch video
                </a>
              ) : null}
            </Section>

            <Section title="Closing notes">
              <p className="text-sm text-pasha-ink leading-relaxed">{String(row.closing_notes ?? "—")}</p>
              <div className="mt-3 flex gap-3 text-[11px] text-pasha-muted">
                {row.whatsapp_optin ? <span>✓ WhatsApp opt-in</span> : null}
                {row.facebook_optin ? <span>✓ Facebook opt-in</span> : null}
              </div>
            </Section>
          </div>
        )}
        <div className="px-6 py-4 border-t border-pasha-line bg-pasha-stone/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => act("rejected")}
            disabled={!!acting}
            className="inline-flex items-center gap-1.5 rounded-full border border-pasha-line bg-white px-4 py-2 text-xs font-medium text-pasha-red hover:bg-pasha-red/[0.04] disabled:opacity-50 transition-colors"
          >
            {acting === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Reject
          </button>
          <button
            type="button"
            onClick={() => act("watchlist")}
            disabled={!!acting}
            className="inline-flex items-center gap-1.5 rounded-full border border-pasha-line bg-white px-4 py-2 text-xs font-medium text-tier-watchlist hover:bg-tier-watchlist/[0.06] disabled:opacity-50 transition-colors"
          >
            {acting === "watchlist" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Watchlist
          </button>
          {/* Edit listing — only visible once the submission has been
              approved (and therefore has a matching databank row). Routes
              to the full editor where logo, key persons, socials, etc.
              can be changed. */}
          {databankId ? (
            <Link
              href={`/admin/databank/${databankId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-pasha-line bg-white px-4 py-2 text-xs font-medium text-pasha-ink hover:border-pasha-ink/30 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit listing
            </Link>
          ) : null}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => act("approved")}
            disabled={!!acting}
            className="inline-flex items-center gap-1.5 rounded-full bg-pasha-red px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-pasha-red-dark disabled:opacity-50 transition-colors"
          >
            {acting === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve
          </button>
        </div>
      </motion.aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h4 className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted mb-3">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-32 shrink-0 text-pasha-muted text-xs pt-0.5">{k}</span>
      <span className="flex-1 text-pasha-ink break-words">{v}</span>
    </div>
  );
}

function renderYesNo(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

/** Stringified URL → KV row with "View" link, falling back to —. */
function SocialKV({ k, v }: { k: string; v: unknown }) {
  if (!v || typeof v !== "string") return <KV k={k} v="—" />;
  return (
    <KV
      k={k}
      v={
        <a
          href={safeHref(v)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pasha-red hover:underline"
        >
          {v.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      }
    />
  );
}

/**
 * Founder section for the admin drawer.
 *
 * Modern v2/v3 submissions store founders as a JSONB array on the row. Each
 * entry has name, role, email, mobile, linkedin, x, instagram, facebook,
 * custom_links, photo_url, gender, is_primary. We render one card per
 * founder with the photo, identity, contact info, and every social link.
 *
 * Older v1 submissions never wrote the founders array — only the flat
 * founder_name / founder_email / founder_mobile / founder_linkedin columns.
 * For those rows we fall back to a single legacy card so admins can still
 * see the contact.
 */
function FoundersSection({ row }: { row: Record<string, unknown> }) {
  const list = Array.isArray(row.founders) ? (row.founders as Record<string, unknown>[]) : [];
  if (list.length === 0) {
    // Legacy fallback — pre-v2 rows only have the flat columns.
    if (!row.founder_name && !row.founder_email && !row.founder_mobile) {
      return (
        <Section title="Founders">
          <p className="text-sm text-pasha-muted">No founder information.</p>
        </Section>
      );
    }
    return (
      <Section title="Founders">
        <FounderCard
          founder={{
            name: row.founder_name,
            role: row.founder_role,
            email: row.founder_email,
            mobile: row.founder_mobile,
            linkedin: row.founder_linkedin,
            photo_url: row.founder_photo_url,
            gender: row.founder_gender,
            is_primary: true,
          }}
        />
      </Section>
    );
  }
  return (
    <Section title={`Founders (${list.length})`}>
      {list.map((f, i) => (
        <FounderCard key={i} founder={f} />
      ))}
    </Section>
  );
}

function FounderCard({ founder }: { founder: Record<string, unknown> }) {
  const name = String(founder.name ?? "—").trim() || "—";
  const role = String(founder.role ?? "").trim();
  const photo = typeof founder.photo_url === "string" ? founder.photo_url : null;
  const email = typeof founder.email === "string" ? founder.email : null;
  const mobile = typeof founder.mobile === "string" ? founder.mobile : null;
  const gender = typeof founder.gender === "string" ? founder.gender : null;

  const socials: { label: string; url: string }[] = [];
  const push = (label: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) socials.push({ label, url: v.trim() });
  };
  push("LinkedIn", founder.linkedin);
  push("X", founder.x);
  push("Instagram", founder.instagram);
  push("Facebook", founder.facebook);
  if (Array.isArray(founder.custom_links)) {
    (founder.custom_links as Record<string, unknown>[]).forEach((cl) => {
      if (typeof cl?.url === "string" && cl.url.trim()) {
        socials.push({
          label: typeof cl.label === "string" && cl.label ? cl.label : "Link",
          url: cl.url.trim(),
        });
      }
    });
  }

  return (
    <div className="mb-3 last:mb-0 rounded-lg border border-pasha-line bg-white p-3 flex items-start gap-3">
      <div className="shrink-0 w-12 h-12 rounded-full border border-pasha-line bg-pasha-stone/50 grid place-items-center overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeImageSrc(photo)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="text-xs font-semibold text-pasha-muted">
            {(name || "")
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-pasha-ink break-words">
            {name}
          </span>
          {founder.is_primary ? (
            <span className="text-[10px] font-mono uppercase tracking-[1px] text-pasha-red">
              Primary
            </span>
          ) : null}
        </div>
        {role && <div className="text-pasha-muted mt-0.5">{role}</div>}
        {(email || mobile || gender) && (
          <div className="mt-2 space-y-0.5 text-pasha-muted">
            {email ? (
              <div>
                <a
                  href={`mailto:${email}`}
                  className="text-pasha-red hover:underline"
                >
                  {email}
                </a>
              </div>
            ) : null}
            {mobile ? <div>{mobile}</div> : null}
            {gender ? <div className="capitalize">{gender}</div> : null}
          </div>
        )}
        {socials.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {socials.map((s, i) => (
              <a
                key={`${s.label}-${i}`}
                href={safeHref(s.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pasha-red hover:underline"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
