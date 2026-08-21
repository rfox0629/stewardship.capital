import Link from "next/link";

import { ScMark } from "./sc-mark";

export function SiteFooter() {
  return (
    <footer className="sc-footer">
      <div className="sc-footer-inner">
        <div className="sc-footer-brand">
          <ScMark inverted />
          <p>
            Purposeful management of what God has entrusted to us. Time, talent,
            and treasure held as one trust.
          </p>
        </div>

        <div className="sc-footer-columns">
          <div>
            <h2>Stewardship</h2>
            <Link href="/#trust">The trust</Link>
            <Link href="/#movement">The movement</Link>
            <Link href="/#expressions">Expressions</Link>
          </div>
          <div>
            <h2>Expressions</h2>
            <Link href="/events">Stewardship Events</Link>
            <span className="sc-footer-static">Operating System, in development</span>
          </div>
          <div>
            <h2>Connect</h2>
            <a href="mailto:hello@stewardship.capital">hello@stewardship.capital</a>
          </div>
        </div>
      </div>

      <div className="sc-footer-base">
        <p>Stewardship Capital</p>
        <p>
          Stewardship Capital does not provide legal, tax, or investment advice.
        </p>
      </div>
    </footer>
  );
}
