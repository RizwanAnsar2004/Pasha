"use client";

import { motion } from "framer-motion";

// Per-navigation enter animation. Next.js remounts template.tsx on EVERY route
// change (unlike layout.tsx), so a fresh fade-up plays on each page without any
// AnimatePresence / exit / FrozenRouter / pathname-key machinery. That machinery
// (previously in components/PageTransition.tsx) fought the App Router and caused
// React #310 + "removeChild of null" crashes and blank redirect-target pages;
// dropping the exit animation removes the entire failure surface. The branded
// PageLoader (PageReadyProvider) still covers each swap, so the missing fade-out
// isn't noticeable.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
