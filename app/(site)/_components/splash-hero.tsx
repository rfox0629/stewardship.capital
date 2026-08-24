import Link from "next/link";

import { SplashScene } from "./splash-scene";

/**
 * The splash.
 *
 * One idea per screen: the name at the largest size the viewport allows, and a
 * single way in. The wordmark is SVG text with an explicit textLength so it
 * spans edge to edge at every width instead of guessing with viewport units.
 */
export function SplashHero() {
  return (
    <section className="sc-splash" aria-labelledby="sc-splash-title">
      <div className="sc-splash-sky" aria-hidden="true">
        <SplashScene />
        <span className="sc-splash-scrim" />
      </div>

      <div className="sc-splash-inner">
        <h1 id="sc-splash-title" className="sc-splash-title">
          <span className="sc-visually-hidden">Stewardship.Capital</span>
          <svg
            className="sc-splash-wordmark"
            viewBox="0 0 1200 156"
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            aria-hidden="true"
          >
            <text
              x="600"
              y="120"
              textAnchor="middle"
              textLength="1188"
              lengthAdjust="spacingAndGlyphs"
            >
              Stewardship.Capital
            </text>
          </svg>
        </h1>
      </div>

      <Link className="sc-splash-cta" href="#statement">
        <span>Click here to learn more</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 4 V19 M6 13 L12 19 L18 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </section>
  );
}
