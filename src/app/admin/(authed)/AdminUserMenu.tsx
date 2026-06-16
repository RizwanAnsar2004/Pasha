import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

function emailInitial(email: string) {
  const local = email.split("@")[0]?.trim();
  const ch = local?.[0];
  return ch ? ch.toUpperCase() : "?";
}

export function AdminUserMenu({ email }: { email: string }) {
  const initial = emailInitial(email);

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
      <form action="/admin/logout" method="post">
        <Button type="submit" variant="outline" size="sm">
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
