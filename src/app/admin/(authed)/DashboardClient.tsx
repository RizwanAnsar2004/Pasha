"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Inbox, Clock, CheckCircle2, Database, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type RecentRow = {
  id: string;
  startup_name: string | null;
  founder_name: string | null;
  founder_email: string | null;
  vetting_tier: string | null;
  vetting_score: number | null;
  status: string | null;
  created_at: string;
};

type Initial = {
  submissions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    watchlist: number;
    last_24h: number;
    last_7d: number;
  };
  databank: {
    total: number;
    not_contacted: number;
    invited: number;
    submitted: number;
    with_revenue: number;
    with_investment: number;
  };
  sectorData: { name: string; value: number }[];
  tierCounts: Record<string, number>;
  recent: RecentRow[];
};

export function DashboardClient({ initial }: { initial: Initial }) {
  const tierEntries = Object.entries(initial.tierCounts);

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={<Inbox className="w-4 h-4" />}
          label="Submissions"
          value={initial.submissions.total}
          subline={`${initial.submissions.last_24h} in last 24h`}
          accent="red"
        />
        <StatTile
          icon={<Clock className="w-4 h-4" />}
          label="Awaiting review"
          value={initial.submissions.pending}
          subline={`${initial.submissions.last_7d} this week`}
          accent="orange"
        />
        <StatTile
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Approved"
          value={initial.submissions.approved}
          subline={`${initial.submissions.rejected} rejected`}
          accent="green"
        />
        <StatTile
          icon={<Database className="w-4 h-4" />}
          label="Data bank"
          value={initial.databank.total}
          subline={`${initial.databank.with_revenue} with revenue`}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sector chart */}
        <div className="lg:col-span-2 rounded-2xl border border-pasha-line bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-pasha-ink">
                Submissions by sector
              </h3>
              <p className="text-xs text-pasha-muted">Top 8</p>
            </div>
          </div>
          {initial.sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={initial.sectorData} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6B6B6B" }}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(230,22,15,0.04)" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#E6160F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Tier breakdown */}
        <div className="rounded-2xl border border-pasha-line bg-white p-5">
          <h3 className="text-sm font-semibold text-pasha-ink mb-4">Tier breakdown</h3>
          {tierEntries.length > 0 ? (
            <div className="space-y-3">
              {(["featured", "listed", "watchlist", "excluded"] as const).map((tier) => {
                const v = initial.tierCounts[tier] ?? 0;
                const total = Object.values(initial.tierCounts).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round((v / total) * 100);
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="capitalize text-pasha-ink">{tier}</span>
                      <span className="font-mono text-pasha-muted">
                        {v} <span className="opacity-50">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-pasha-line overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          tier === "featured" && "bg-tier-featured",
                          tier === "listed" && "bg-tier-listed",
                          tier === "watchlist" && "bg-tier-watchlist",
                          tier === "excluded" && "bg-pasha-muted"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Recent submissions */}
      <div className="rounded-2xl border border-pasha-line bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-pasha-ink">Recent submissions</h3>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1 text-xs text-pasha-red hover:underline"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {initial.recent.length === 0 ? (
          <p className="text-sm text-pasha-muted py-8 text-center">
            No submissions yet. Share the apply link to get started.
          </p>
        ) : (
          <div className="divide-y divide-pasha-line/60">
            {initial.recent.map((r) => (
              <Link
                key={r.id}
                href={`/admin/submissions?id=${r.id}`}
                className="flex items-center justify-between gap-4 py-3 hover:bg-pasha-stone/40 px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-pasha-ink truncate">
                    {r.startup_name ?? "—"}
                  </p>
                  <p className="text-xs text-pasha-muted truncate">
                    {r.founder_name ?? "—"} · {r.founder_email}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {r.vetting_tier && <TierBadge tier={r.vetting_tier} />}
                  <span className="font-mono text-pasha-muted">
                    {r.vetting_score ?? 0}/50
                  </span>
                  <span className="text-pasha-muted hidden sm:block">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  subline,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subline: string;
  accent: "red" | "orange" | "green" | "blue";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-pasha-line bg-white p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-pasha-muted truncate min-w-0">
          {label}
        </span>
        <span
          className={cn(
            "w-7 h-7 rounded-md grid place-items-center shrink-0",
            accent === "red" && "bg-pasha-red/10 text-pasha-red",
            accent === "orange" && "bg-tier-watchlist/10 text-tier-watchlist",
            accent === "green" && "bg-tier-featured/10 text-tier-featured",
            accent === "blue" && "bg-tier-listed/10 text-tier-listed"
          )}
        >
          {icon}
        </span>
      </div>
      <p className="font-serif text-4xl tracking-tight text-pasha-ink">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-pasha-muted">{subline}</p>
    </motion.div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
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
  );
}

function EmptyChart() {
  return (
    <div className="py-10 text-center text-xs text-pasha-muted">
      Data will appear once submissions start flowing.
    </div>
  );
}
