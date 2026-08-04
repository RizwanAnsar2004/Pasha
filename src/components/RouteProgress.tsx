"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

// Watches the active route and reports every change. Split out of the provider
// for one reason: `useSearchParams()` opts its whole Suspense boundary out of
// static rendering, and React then throws that subtree away and re-renders it
// on the client after hydration.
//
// While this hook lived in the provider, the nearest boundary was the one in
// app/layout.tsx wrapping the entire page — so every route's DOM was built
// twice, and the second build restarted the `.page-enter` animation. That was
// visible as the hero fading in twice (only sometimes: it depended on whether
// hydration landed before or after the first 0.35s animation had finished).
//
// Here the bailout is contained to a component that renders null, so nothing
// user-visible is inside the re-rendered boundary. Keep it that way: this must
// stay a leaf with its own <Suspense>, and `useSearchParams` must not move back
// up into the provider.
function RouteChangeWatcher({ onRouteChange }: { onRouteChange: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  // Fires on mount and on every subsequent route change, and always clears
  // unconditionally. The earlier version compared against a stored key and
  // cleared only on a mismatch, which is how a browser Back to an already-seen
  // route could fail to match and leave the bar spinning forever.
  useEffect(() => {
    onRouteChange();
  }, [currentKey, onRouteChange]);

  return null;
}

export function RouteProgressProvider({ children }: { children: React.ReactNode }) {
  // Bumped on every start(); cleared when the route changes or done() is called.
  const [pending, setPending] = useState(false);

  const start = useCallback(() => setPending(true), []);
  const done = useCallback(() => setPending(false), []);
  const api = useMemo(() => ({ start, done }), [start, done]);

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
      {/* Renders null — see RouteChangeWatcher for why it is isolated behind
          its own boundary rather than reading the route in this component. */}
      <Suspense fallback={null}>
        <RouteChangeWatcher onRouteChange={done} />
      </Suspense>
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
