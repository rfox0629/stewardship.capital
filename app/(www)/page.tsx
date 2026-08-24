import Link from "next/link";

import { MultiplierField } from "./_components/multiplier-field";

/**
 * A title screen, not a landing page.
 *
 * One statement, one line of support, one quiet scripture, one way forward.
 * Nothing below the fold.
 */
export default function HomePage() {
  return (
    <section className="title" aria-labelledby="title-heading">
      <MultiplierField />

      <div className="title-inner">
        <div className="mask">
          <h1 id="title-heading">Time. Talent. Treasure.</h1>
        </div>

        <div className="mask">
          <p className="title-sub">
            Helping steward what God has entrusted to you.
          </p>
        </div>

        <div className="mask">
          <blockquote className="title-scripture">
            <p>
              &ldquo;So then every one of us shall give account of himself to
              God.&rdquo;
            </p>
            <cite>Romans 14:12</cite>
          </blockquote>
        </div>

        <div className="mask">
          <Link className="more" href="/more">
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
