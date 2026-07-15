"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PageLoader } from "./PageLoader";

// Shared "the intro loader has finished" signal. Page entrance animations read
// this (via usePageReady) and hold at their initial state until it flips true,
// so they visibly play AFTER the PageLoader fades instead of finishing behind it.
//
// The loader runs on the first load AND on every client-side route change, so the
// branded transition + entrance animations replay on each page change.
//
// Default `true`: any component used outside the provider animates normally
// rather than getting stuck hidden.
const PageReadyContext = createContext(true);

export function usePageReady(): boolean {
  return useContext(PageReadyContext);
}

// First load waits for the real page load (+ a branded minimum); subsequent
// in-app navigations show a shorter loader since there's no window `load` event.
const FIRST_MIN_MS = 700;
const NAV_MIN_MS = 350;
const SAFETY_MS = 4000;

export function PageReadyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const prevPath = useRef(pathname);
  const isFirst = useRef(true);

  // Re-hold synchronously when the route changes, before paint, so the new page
  // doesn't flash in fully-revealed for a frame before the loader appears.
  if (prevPath.current !== pathname) {
    prevPath.current = pathname;
    setReady(false);
  }

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    const first = isFirst.current;
    isFirst.current = false;

    const minDelay = new Promise<void>((r) => setTimeout(r, first ? FIRST_MIN_MS : NAV_MIN_MS));
    // Only the first load has a meaningful window `load`; client navigations
    // don't, so just resolve immediately and rely on the minimum delay.
    const pageLoaded = first
      ? new Promise<void>((r) => {
          if (document.readyState === "complete") r();
          else window.addEventListener("load", () => r(), { once: true });
        })
      : Promise.resolve();

    Promise.all([minDelay, pageLoaded]).then(finish);

    // Safety net: never leave content hidden if a promise never settles.
    const safety = window.setTimeout(finish, SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, [pathname]);

  return (
    <PageReadyContext.Provider value={ready}>
      <PageLoader show={!ready} />
      {children}
    </PageReadyContext.Provider>
  );
}
