"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

// Shared "the intro loader has finished" signal. Page entrance animations read
// this (via usePageReady) and hold at their initial state until it flips true,
// so they visibly play AFTER the PageLoader fades instead of finishing behind it.
//
// Default `true`: any component used outside the provider (or before mount)
// animates normally rather than getting stuck hidden.
const PageReadyContext = createContext(true);

export function usePageReady(): boolean {
  return useContext(PageReadyContext);
}

export function PageReadyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    // Branded minimum on-screen time + actual page load, whichever is longer.
    const minDelay = new Promise<void>((r) => setTimeout(r, 1800));
    const pageLoaded = new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    });
    Promise.all([minDelay, pageLoaded]).then(finish);

    // Safety net: never leave content hidden if `load` never fires (cached/stalled
    // assets, blocked subresources, etc.).
    const safety = window.setTimeout(finish, 5000);
    return () => window.clearTimeout(safety);
  }, []);

  return (
    <PageReadyContext.Provider value={ready}>
      <PageLoader show={!ready} />
      {children}
    </PageReadyContext.Provider>
  );
}
