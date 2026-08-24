import Link from "next/link";

import { Wordmark } from "./wordmark";

/**
 * The brand mark, and nothing else.
 *
 * Spark is the only product exposed publicly, and it is reached through the
 * single call to action on the page rather than through navigation.
 */
export function SiteNav() {
  return (
    <header className="nav">
      <Link className="nav-brand" href="/" aria-label="Stewardship.Capital home">
        <Wordmark />
      </Link>
    </header>
  );
}
