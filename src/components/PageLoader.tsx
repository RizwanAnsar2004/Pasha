"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const EASE = [0.22, 1, 0.36, 1] as const;
const CIRCUMFERENCE = 2 * Math.PI * 44; // r = 44

export function PageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const minDelay = new Promise<void>((r) => setTimeout(r, 1800));
    const pageReady = new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    });
    Promise.all([minDelay, pageReady]).then(() => setVisible(false));
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(160deg, #FAF8F4 0%, #FFFFFF 60%, #FFF5F5 100%)" }}
        >
          {/* Dot texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(14,14,16,0.06) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-48 -left-32 w-[500px] h-[500px] rounded-full bg-pasha-red/[0.05] blur-[130px]" />
          <div aria-hidden className="absolute -bottom-48 -right-32 w-[500px] h-[500px] rounded-full bg-pasha-red/[0.04] blur-[130px]" />

          {/* Main loader container */}
          <div className="relative flex flex-col items-center">

            {/* Spinning outer ring */}
            <div className="relative w-36 h-36">
              {/* Static track ring */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="rgba(230,22,15,0.08)"
                  strokeWidth="2"
                />
              </svg>

              {/* Animated fill ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <motion.circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="url(#redGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.6, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E6160F" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E6160F" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Rotating dot on ring tip */}
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
                style={{ transformOrigin: "center" }}
              >
                <div
                  className="absolute w-2.5 h-2.5 rounded-full bg-pasha-red shadow-[0_0_8px_2px_rgba(230,22,15,0.5)]"
                  style={{ top: "calc(50% - 44%)", left: "calc(50% - 5px)" }}
                />
              </motion.div>

              {/* Logo centered inside ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Image
                  src="/pasha-logo.png"
                  alt="P@SHA"
                  width={88}
                  height={28}
                  priority
                  className="h-auto object-contain"
                />
              </motion.div>
            </div>

            {/* Brand text beneath ring */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
              className="mt-7 flex flex-col items-center gap-1"
            >
              <span className="font-mono text-[10px] uppercase tracking-[4px] text-pasha-ink/40">
                Pakistan IT Industry Association
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-pasha-red/30" />
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-pasha-red/50">
                  Startup Community
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-pasha-red/30" />
              </div>
            </motion.div>

            {/* Pulse dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 flex items-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-pasha-red/40"
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
