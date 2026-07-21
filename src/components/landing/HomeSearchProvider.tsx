"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

type HomeSearchState = {
  keyword: string;
  sector: string;
  stage: string;
  setKeyword: (v: string) => void;
  setSector: (v: string) => void;
  setStage: (v: string) => void;
  submit: () => void;
  quickFilter: (sector: string) => void;
  reset: () => void;
};

const HomeSearchContext = createContext<HomeSearchState | null>(null);

export function useHomeSearch(): HomeSearchState {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) {
    throw new Error("useHomeSearch must be used within a HomeSearchProvider");
  }
  return ctx;
}

export function HomeSearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");

  // The homepage search bar is just an entry point — it hands off to the full /directory listing (query carried over as URL params) rather than.
  const goToDirectory = useCallback(
    (overrides?: { sector?: string }) => {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("q", keyword.trim());
      const nextSector = overrides?.sector ?? sector;
      if (nextSector !== "all") params.set("sector", nextSector);
      if (stage !== "all") params.set("stage", stage);
      const qs = params.toString();
      router.push(qs ? `/directory?${qs}` : "/directory");
    },
    [keyword, sector, stage, router]
  );

  const submit = useCallback(() => {
    goToDirectory();
  }, [goToDirectory]);

  const quickFilter = useCallback(
    (nextSector: string) => {
      setSector(nextSector);
      goToDirectory({ sector: nextSector });
    },
    [goToDirectory]
  );

  const reset = useCallback(() => {
    setKeyword("");
    setSector("all");
    setStage("all");
    router.push("/directory");
  }, [router]);

  return (
    <HomeSearchContext.Provider
      value={{ keyword, sector, stage, setKeyword, setSector, setStage, submit, quickFilter, reset }}
    >
      {children}
    </HomeSearchContext.Provider>
  );
}
