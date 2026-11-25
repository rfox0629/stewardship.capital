import Link from "next/link";

import { Wordmark } from "@app/(www)/_components/wordmark";
import { PLATFORM_HOME } from "@lib/spark/paths";

/**
 * The platform's own chrome: the Stewardship.Capital mark, where on the
 * platform this is, and the way out.
 *
 * The same wordmark the public site sets, with the node as its period, and
 * nothing in front of it. Signing out is a real form so it is a POST, and it
 * lands back on the platform door rather than on the product's.
 */
export function PlatformBar({ section = "Platform" }: { section?: string }) {
  return (
    <header className="pf-bar">
      <div className="pf-bar-crumbs">
        <Link className="pf-bar-mark" href="/" aria-label="Stewardship.Capital home">
          <Wordmark />
        </Link>
        <span className="pf-bar-sep" aria-hidden="true">
          /
        </span>
        <span className="pf-bar-section">{section}</span>
      </div>
      <form action="/spark/signout" method="post">
        <input type="hidden" name="next" value={PLATFORM_HOME} />
        <button className="pf-bar-signout" type="submit">
          Sign out
        </button>
      </form>
    </header>
  );
}
