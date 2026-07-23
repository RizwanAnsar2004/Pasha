"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin progress bar across the top of the viewport while a route change is in
// flight. App Router navigations render on the server, so between the click and
// the new page there is a gap with no feedback at all — on a slow query that
// reads as a dead click and gets clicked again.
//
// There is no global "navigation started" event in the App Router, so this
// listens for clicks on same-origin anchors (capture phase, before React sees
// them) and clears itself when the pathname or query actually changes.

const SAFETY_TIMEOUT_MS = 15_000;

function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The route we were on when the click happened. The bar is showing exactly
  // while we're still on it — derived during render rather than cleared by an
  // effect, which would cost an extra pass on every navigation. Comparing
  // against where we came FROM (not where we're going) also survives redirects,
  // e.g. /apply bouncing to /apply/login.
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const currentKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const active = pendingFrom !== null && pendingFrom === currentKey;

  // The click listener is bound once, so it reads the live route from a ref
  // kept in sync after each commit.
  const currentKeyRef = useRef(currentKey);
  useEffect(() => {
    currentKeyRef.current = currentKey;
  }, [currentKey]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!isPlainLeftClick(e) || e.defaultPrevented) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      // Off-site, or a different protocol (mailto:, tel:) — the browser handles
      // it and this page may not even unload.
      if (url.origin !== window.location.origin) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      // Same page, or a pure hash jump: nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      setPendingFrom(currentKeyRef.current);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Never leave the bar stuck if a navigation is cancelled or blocked.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setPendingFrom(null), SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-pasha-red/15"
    >
      <div className="route-progress-bar h-full w-1/3 bg-pasha-red" />
    </div>
  );
}
