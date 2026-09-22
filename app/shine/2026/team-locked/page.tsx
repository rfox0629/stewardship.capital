import type { Metadata } from "next";

import { safeNext } from "@lib/spark/event-code";

import { previewMetadata, TEAM_DESCRIPTION, TEAM_TITLE } from "../preview";
import { CodeForm } from "./code-form";

/**
 * The team guide's own front door.
 *
 * The route guard serves this in place of the team guide for anyone without
 * the weekend's code. It is a SHINE page, not a Spark one: nobody is sent off
 * to a product they have never heard of to sign in to an account they do not
 * have. A phone unfurling the link lands here too, which is why it carries
 * the weekend's name and nothing else about the weekend.
 */

export const metadata: Metadata = previewMetadata(
  TEAM_TITLE, TEAM_DESCRIPTION, "/shine/2026/team",
);

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TeamLocked({ searchParams }: PageProps) {
  /* A deep link is remembered across the door, so someone opening Saturday's
     duties from a message lands on Saturday's duties. */
  const params = await searchParams;
  const asked = typeof params.next === "string" ? params.next : null;

  return (
    <section className="gd-shell gd-page gd-gate" aria-label="Team guide">
      <div className="gd-gate-card">
        <h2 className="gd-gate-head">Welcome, SHINE Team</h2>
        <p className="gd-gate-lede">
          Enter the team code to access the schedule, run of show, and volunteer duties.
        </p>
        <CodeForm next={safeNext(asked)} />
      </div>
    </section>
  );
}
