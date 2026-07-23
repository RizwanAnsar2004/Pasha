"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import styles from "./HeroPhotoSlider.module.css";

const AUTOPLAY_MS = 7000;

type Slide = {
  image: string;
  alt: string;
  shadeClass?: keyof typeof styles;
  kicker: string;
  heading: string;
  headingTag: "h1" | "h2";
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  primaryExternal?: boolean;
  secondaryHref: string;
  secondaryLabel: string;
  secondaryExternal?: boolean;
  tabNumber: string;
  tabTitle: string;
};

// Anchors (#ecosystem, #apply, #awards, #directory) match the `id` on the
// corresponding homepage sections — see Ecosystem.tsx, JoinCTA.tsx,
// AwardWinningStartups.tsx and DirectoryBento.tsx.
const SLIDES: Slide[] = [
  {
    image: "/hero-hub.jpg",
    alt: "Startup team collaborating around ideas and plans",
    kicker: "Pakistan's national startup ecosystem platform",
    heading: "PASHA Startup Hub",
    headingTag: "h1",
    lead: "Connecting Pakistan’s Startup Ecosystem.",
    primaryHref: "#ecosystem",
    primaryLabel: "Explore the Hub",
    secondaryHref: "#apply",
    secondaryLabel: "Join the Hub",
    tabNumber: "01",
    tabTitle: "Startup Hub",
  },
  {
    image: "/hero-awards.jpg",
    alt: "Technology leaders presenting to an audience at a major event",
    shadeClass: "hero-photo-shade-awards",
    kicker: "Celebrating Pakistan's technology excellence",
    heading: "PASHA ICT Awards",
    headingTag: "h2",
    lead: "Pakistan’s Premier AI-Enabled Awards Are Back. Celebrate innovation. Compete internationally. Shape the future. ",
    primaryHref: "https://pashaictawards.com/award-categories/",
    primaryLabel: "Apply Now",
    primaryExternal: true,
    secondaryHref: "https://pashaictawards.com",
    secondaryLabel: "Visit Website",
    secondaryExternal: true,
    tabNumber: "02",
    tabTitle: "ICT Awards",
  },
  {
    image: "/hero-directory.jpg",
    alt: "Startup team reviewing a digital product together",
    shadeClass: "hero-photo-shade-directory",
    kicker: "Discover the builders shaping Pakistan's future",
    heading: "Startup Directory",
    headingTag: "h2",
    lead: "Discover credible Pakistani startups by sector, stage, and solution, and connect with the right founders for investment, partnerships, customers, and collaboration.",
    primaryHref: "/directory",
    primaryLabel: "Explore the Directory",
    secondaryHref: "#directory",
    secondaryLabel: "View featured startups",
    tabNumber: "03",
    tabTitle: "Directory",
  },
];

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function Hero() {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    if (reduceMotionRef.current) return;
    timerRef.current = setInterval(() => {
      const next = wrap(activeRef.current + 1, SLIDES.length);
      activeRef.current = next;
      setActive(next);
    }, AUTOPLAY_MS);
  }, [stopTimer]);

  // Autoplay tick advances the slide without resetting its own interval
  // (restart=false); user-initiated navigation restarts the countdown
  // (restart=true) — same split as the reference implementation.
  const goTo = useCallback(
    (index: number, restart = true) => {
      const next = wrap(index, SLIDES.length);
      activeRef.current = next;
      setActive(next);
      if (restart) startTimer();
    },
    [startTimer]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mediaQuery.matches;

    function handleChange(event: MediaQueryListEvent) {
      reduceMotionRef.current = event.matches;
      if (event.matches) stopTimer();
      else startTimer();
    }

    mediaQuery.addEventListener("change", handleChange);
    startTimer();

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") goTo(active - 1);
    if (event.key === "ArrowRight") goTo(active + 1);
  }

  return (
    <section
      aria-label="PASHA Startup Hub highlights"
      className={styles["hero-photo-slider"]}
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
      onFocus={stopTimer}
      onBlur={startTimer}
      onKeyDown={handleKeyDown}
    >
      <div className={styles["hero-photo-frame"]}>
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          const Heading = slide.headingTag;
          const primaryButton = (
            <>
              {slide.primaryLabel} <span aria-hidden="true">→</span>
            </>
          );
          return (
            <article
              key={slide.heading}
              aria-hidden={!isActive}
              className={`${styles["hero-photo-slide"]} ${isActive ? styles["is-active"] : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- absolutely-positioned, ken-burns-animated background; next/image's wrapper would break the transform animation */}
              <img alt={slide.alt} className={styles["hero-photo-bg"]} src={slide.image} />
              <div
                className={`${styles["hero-photo-shade"]} ${slide.shadeClass ? styles[slide.shadeClass] : ""}`}
              />
              <div className={`${styles["hero-photo-container"]} ${styles["hero-photo-content"]}`}>
                <Heading>{slide.heading}</Heading>
                <p className={styles["hero-photo-lead"]}>{slide.lead}</p>
                <div className={styles["hero-photo-actions"]}>
                  {slide.primaryExternal ? (
                    <a
                      className={`${styles["hero-photo-button"]} ${styles["hero-photo-button-primary"]}`}
                      href={slide.primaryHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {primaryButton}
                    </a>
                  ) : slide.primaryHref.startsWith("/") ? (
                    <Link
                      className={`${styles["hero-photo-button"]} ${styles["hero-photo-button-primary"]}`}
                      href={slide.primaryHref}
                    >
                      {primaryButton}
                    </Link>
                  ) : (
                    <a
                      className={`${styles["hero-photo-button"]} ${styles["hero-photo-button-primary"]}`}
                      href={slide.primaryHref}
                    >
                      {primaryButton}
                    </a>
                  )}
                  <a
                    className={`${styles["hero-photo-button"]} ${styles["hero-photo-button-ghost"]}`}
                    href={slide.secondaryHref}
                    {...(slide.secondaryExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {slide.secondaryLabel}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <SiteHeader variant="overlay" />

      <div className={`${styles["hero-photo-container"]} ${styles["hero-photo-controls"]}`}>
        <div aria-label="Hero slides" className={styles["hero-photo-tabs"]} role="tablist">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.tabTitle}
              aria-selected={index === active}
              className={index === active ? styles["is-active"] : ""}
              onClick={() => goTo(index)}
              role="tab"
              type="button"
            >
              <span>{slide.tabNumber}</span>
              {slide.tabTitle}
            </button>
          ))}
        </div>
        <div className={styles["hero-photo-arrows"]}>
          <button aria-label="Previous slide" onClick={() => goTo(active - 1)} type="button">
            ←
          </button>
          <button aria-label="Next slide" onClick={() => goTo(active + 1)} type="button">
            →
          </button>
        </div>
      </div>
    </section>
  );
}
