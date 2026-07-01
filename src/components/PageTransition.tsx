"use client";

import { useContext, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Route-change page transition. Wraps the routed content in an AnimatePresence
// keyed on the pathname so each navigation plays an exit → enter animation.
//
// Works alongside PageReadyProvider: the branded PageLoader covers the swap,
// then this fade-up plays as the new page reveals. Kept intentionally subtle so
// it complements — rather than fights — the per-section entrance animations.

/**
 * Freeze Next's App Router context for the OUTGOING page during its exit.
 *
 * With `mode="wait"` the old page stays mounted while it animates out, but Next
 * has already advanced LayoutRouterContext to the new route. Left unfrozen, the
 * exiting subtree (a) re-renders against a mismatched context and throws React
 * error #310 ("Rendered more hooks than during the previous render") and
 * (b) lets Next mutate DOM nodes Framer Motion is still animating — which crashes
 * with "Cannot read properties of null (reading 'removeChild')" and silently
 * aborts the navigation until a full reload. Capturing the context at mount and
 * re-providing it keeps the outgoing tree stable for the length of its exit.
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;

  if (!frozen) return <>{children}</>;

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-1 flex-col"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
