"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : y },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EASE } },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
