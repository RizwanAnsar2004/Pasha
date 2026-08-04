"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

// framer-motion's full `motion` component bundles every feature it supports —
// animations, gestures, layout projection, drag — and pulls the lot into the
// first chunk that touches it. On this site that put it inside all three of the
// homepage's largest JavaScript chunks, and parsing it was the single biggest
// contributor to Total Blocking Time.
//
// LazyMotion splits that apart: components render the lightweight `m` element
// and the feature bundle is supplied once, here. `domAnimation` covers
// animations, variants, exit animations and hover/tap/focus gestures — every
// feature this codebase actually uses. It deliberately excludes layout
// animations and drag; a search for `layout`, `layoutId` and `drag` found no
// usage, so nothing regresses. If either is ever needed, swap in `domMax`.
//
// `strict` makes any remaining `motion.*` usage throw instead of silently
// pulling the full bundle back in and undoing this. It is limited to
// development so a single missed component surfaces immediately while we work,
// without being able to take a page down in production.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={process.env.NODE_ENV === "development"}>
      {children}
    </LazyMotion>
  );
}
