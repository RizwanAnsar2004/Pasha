"use client";
import { api } from "@/lib/api/client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

function emailInitial(email: string) {
  const local = email.split("@")[0]?.trim();
  const ch = local?.[0];
  return ch ? ch.toUpperCase() : "?";
}

export function AdminUserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initial = emailInitial(email);

  async function signOut() {
    setLoading(true);
    try {
      api.del("/api/admin/auth");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2.5 w-full min-w-0 overflow-hidden">
      {/* Avatar */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pasha-red/10 text-[11px] font-bold text-pasha-red ring-1 ring-pasha-red/20"
        aria-hidden
      >
        {initial}
      </div>

      {/* Email */}
      <span className="flex-1 min-w-0 text-[12px] font-medium text-slate-700 truncate" title={email}>
        {email}
      </span>

      {/* Sign out */}
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        title="Sign out"
        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <LogOut className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  );
}
