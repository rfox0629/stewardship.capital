import type { Metadata } from "next";

import { loadGuide } from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/load";
import TeamGuidePage from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/team/page";

import { SHINE_2026 } from "../route-params";

/**
 * The team guide, at the short address.
 *
 * A different address is navigation, not permission: the route guard checks
 * this path as the workspace path it stands for, and the page below asks the
 * database again before it renders a single operational row.
 */

export async function generateMetadata(): Promise<Metadata> {
  const loaded = await loadGuide(SHINE_2026.clientSlug, SHINE_2026.eventSlug, SHINE_2026.edition);
  return {
    title: { absolute: loaded ? `Team guide | ${loaded.guide.name}` : "Team guide" },
    alternates: { canonical: "/shine/2026/team" },
  };
}

export default async function ShineTeamGuide() {
  return TeamGuidePage({ params: Promise.resolve(SHINE_2026) });
}
