"use client";

import { useEffect } from "react";

/**
 * Marks [data-reveal] elements as visible once. Additive only: if this never
 * runs, every element is already in its final position.
 */
export function Reveal() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((node) => {
        node.dataset.visible = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );

    targets.forEach((node) => observer.observe(node));

    /* Fail safe. This animation gates the main content of the page, so it must
       never be able to leave it hidden: if the observer has not delivered for
       any reason, reveal everything anyway. In normal use it has long since
       fired and this is a no op. */
    const failSafe = window.setTimeout(() => {
      targets.forEach((node) => {
        node.dataset.visible = "true";
      });
      observer.disconnect();
    }, 2600);

    return () => {
      window.clearTimeout(failSafe);
      observer.disconnect();
    };
  }, []);

  return null;
}
