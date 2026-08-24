import Link from "next/link";

import { MultiplierField } from "./_components/multiplier-field";
import { Wordmark } from "./_components/wordmark";

/**
 * The approved hero composition, with the stewardship statement in it.
 * Nothing below the fold.
 */
export default function HomePage() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <MultiplierField />

      <div className="hero-inner">
        <div className="mask">
          <p className="hero-mark">
            <Wordmark />
          </p>
        </div>

        <div className="mask">
          <h1 id="hero-title">
            <span>Time.</span> <span>Talent.</span> <span>Treasure.</span>
          </h1>
        </div>

        <div className="mask">
          <p className="hero-sub">
            Helping steward what God has entrusted to you, because everyone
            will give an account of themself to God someday.
          </p>
        </div>

        <div className="mask">
          <p className="hero-ref">Romans 14:12</p>
        </div>

        <div className="mask">
          <Link className="more" href="/spark">
            More
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 12h15M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
