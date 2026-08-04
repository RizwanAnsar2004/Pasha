"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The chat widget was imported statically into the root layout, so its
// JavaScript was downloaded, parsed and hydrated on every page load of the
// site — before the visitor had done anything, and on pages where the widget
// is never opened. That work lands squarely in Total Blocking Time.
//
// Nothing about a floating chat button needs to exist during the first paint.
// This wrapper holds it back until the browser is idle, or until the visitor
// does something that suggests they are actually engaging with the page.
const ChatWidget = dynamic(
  () => import("@/components/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

// Interactions that mean "a real person is using this page". Any of them pulls
// the widget in immediately rather than waiting for idle, so someone who
// scrolls straight down and reaches for chat is not left waiting.
const WAKE_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function ChatWidgetLazy() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const load = () => setShow(true);

    for (const evt of WAKE_EVENTS) {
      window.addEventListener(evt, load, { once: true, passive: true });
    }

    return () => {
      for (const evt of WAKE_EVENTS) window.removeEventListener(evt, load);
    };
  }, [show]);

  return show ? <ChatWidget /> : null;
}
