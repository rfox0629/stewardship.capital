import type { Metadata } from "next";
import Link from "next/link";

import { SPARK_ENTRY } from "@lib/spark/paths";

import { previewMetadata, TEAM_DESCRIPTION, TEAM_TITLE } from "../preview";

/**
 * The team guide's front door, for anyone who is not on the team yet.
 *
 * The route guard serves this in place of the team guide, at the team guide's
 * own address, whenever the person asking is not a working member. A phone
 * unfurling a link is exactly that: no session, no membership. So it gets the
 * name of the weekend, a line about what the page is, and the photograph of
 * the property, which is all a preview needs and all it should ever have.
 *
 * Nothing on this page is loaded from the engagement's operational tables.
 * There is no run of show here to leak, and the guard above still refuses the
 * real page, so this is a sign in prompt rather than a way around anything.
 */

export const metadata: Metadata = previewMetadata(
  TEAM_TITLE, TEAM_DESCRIPTION, "/shine/2026/team",
);

export default function TeamLocked() {
  return (
    <section className="gd-shell gd-page gd-locked" aria-label="Team guide">
      <h2 className="gd-pagehead">The team guide</h2>
      <p className="gd-lede">
        The run of show, volunteer duties and your own schedule live here. It
        opens for the team, so sign in with the address your invitation went to.
      </p>
      <Link className="gd-locked-go" href={SPARK_ENTRY}>
        Sign in
      </Link>
      <p className="gd-hint">
        Looking for the weekend itself? <Link href="/shine/2026">Open the guest guide</Link>.
      </p>
    </section>
  );
}
