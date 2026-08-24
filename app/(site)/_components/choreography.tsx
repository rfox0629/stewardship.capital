"use client";

import { useEffect } from "react";

/**
 * Drives the four permitted motions for the Stewardship Capital site:
 * draw, rise, track, respond. Everything here is additive. If this never
 * runs, the page still renders complete and readable.
 */
export function Choreography() {
  useEffect(() => {
    /* ?motion=none renders the settled page with no entrance motion. Useful
       for founder review, screenshots, and printing. */
    const motionOff =
      new URLSearchParams(window.location.search).get("motion") === "none";

    const reduceMotion =
      motionOff ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (motionOff) {
      document.documentElement.dataset.scMotion = "none";
    }

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sc-reveal]"),
    );

    if (reduceMotion) {
      revealTargets.forEach((node) => {
        node.dataset.scVisible = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.scVisible = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );

    revealTargets.forEach((node) => observer.observe(node));

    const trackNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sc-track]"),
    );

    let frame = 0;

    const updateTracks = () => {
      frame = 0;
      trackNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const span = rect.height - window.innerHeight * 0.5;
        if (span <= 0) {
          node.style.setProperty("--sc-progress", "1");
          return;
        }
        const travelled = window.innerHeight * 0.5 - rect.top;
        const ratio = Math.min(Math.max(travelled / span, 0), 1);
        node.style.setProperty("--sc-progress", ratio.toFixed(4));
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateTracks);
    };

    updateTracks();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
