"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pasha-red/10 text-xs font-semibold text-pasha-red ring-1 ring-pasha-red/15"
          aria-hidden
        >
          {initial}
        </div>
        <span
          className="hidden sm:block truncate max-w-[200px] text-sm text-pasha-ink"
          title={email}
        >
          {email}
        </span>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={signOut} disabled={loading}>
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        Sign out
      </Button>
    </div>
  );
}
