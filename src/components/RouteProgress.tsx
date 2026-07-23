"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin progress bar across the top of the viewport while a navigation is in
// flight. App Router routes render on the server, so between the click and the
// new page there is a gap with no feedback — on a slow query that reads as a
// dead click and gets clicked again.
//
// Two triggers:
//  1. Any same-origin anchor click (one document-level listener — covers every
//     <Link> in the app without per-page wiring).
//  2. `useRouteProgress().start()` for flows that navigate programmatically
//     after async work (sign-in, submit), where there is no anchor to observe.
//
// It always completes on the next route change, and has a safety timeout so a
// cancelled navigation can never strand it.

const SAFETY_TIMEOUT_MS = 15_000;

function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

type RouteProgressApi = { start: () => void; done: () => void };

const RouteProgressContext = createContext<RouteProgressApi>({
  start: () => {},
  done: () => {},
});

/** Trigger the top progress bar from a programmatic navigation. */
export function useRouteProgress(): RouteProgressApi {
  return useContext(RouteProgressContext);
}

export function RouteProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Bumped on every start(); cleared when the route changes or done() is called.
  const [pending, setPending] = useState(false);

  const currentKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  // Complete as soon as the route actually changes. Adjusting state during
  // render (React's documented "reset when a value changes" pattern) rather
  // than in an effect — an effect left the flag set, so a browser Back to the
  // same route re-matched it and the bar span forever.
  const [lastKey, setLastKey] = useState(currentKey);
  if (lastKey !== currentKey) {
    setLastKey(currentKey);
    if (pending) setPending(false);
  }

  const start = useCallback(() => setPending(true), []);
  const done = useCallback(() => setPending(false), []);
  const api = useMemo(() => ({ start, done }), [start, done]);

  // The click listener is bound once and reads the live route from a ref.
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

      setPending(true);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Never leave the bar stuck if a navigation is cancelled or blocked.
  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => setPending(false), SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [pending]);

  // A route change scrolls to top. Globals set `html { scroll-behavior: smooth }`
  // for in-page anchors, which makes that jump ANIMATE — so navigating away from
  // the bottom of a long page visibly flies back up. Turn smooth off while a
  // navigation is in flight, then restore it so anchor links still glide.
  useEffect(() => {
    const el = document.documentElement;
    if (pending) {
      el.style.scrollBehavior = "auto";
      return;
    }
    // Restore only once the post-navigation scroll has settled.
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => el.style.removeProperty("scroll-behavior"));
    });
    return () => window.cancelAnimationFrame(id);
  }, [pending]);

  return (
    <RouteProgressContext.Provider value={api}>
      {pending && (
        <div
          role="progressbar"
          aria-label="Loading"
          aria-busy="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-pasha-red/15"
        >
          <div className="route-progress-bar h-full w-1/3 bg-pasha-red" />
        </div>
      )}
      {children}
    </RouteProgressContext.Provider>
  );
}
