"use client";

import { createContext, useCallback, useContext, useState } from "react";

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

function scrollToDirectory() {
  document.getElementById("directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomeSearchProvider({ children }: { children: React.ReactNode }) {
  const [keyword, setKeyword] = useState("");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");

  const submit = useCallback(() => {
    scrollToDirectory();
  }, []);

  const quickFilter = useCallback((nextSector: string) => {
    setSector(nextSector);
    scrollToDirectory();
  }, []);

  const reset = useCallback(() => {
    setKeyword("");
    setSector("all");
    setStage("all");
  }, []);

  return (
    <HomeSearchContext.Provider
      value={{ keyword, sector, stage, setKeyword, setSector, setStage, submit, quickFilter, reset }}
    >
      {children}
    </HomeSearchContext.Provider>
  );
}
