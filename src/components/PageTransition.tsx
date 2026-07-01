"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Route-change page transition. Wraps the routed content in an AnimatePresence
// keyed on the pathname so each navigation plays an exit → enter animation.
//
// Works alongside PageReadyProvider: the branded PageLoader covers the swap,
// then this fade-up plays as the new page reveals. Kept intentionally subtle so
// it complements — rather than fights — the per-section entrance animations.
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
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
