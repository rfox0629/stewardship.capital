import type { Metadata } from "next";

import TeamGuidePage from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/team/page";

import { previewMetadata, TEAM_DESCRIPTION, TEAM_TITLE } from "../preview";
import { SHINE_2026 } from "../route-params";

/**
 * The team guide, at the short address.
 *
 * A different address is navigation, not permission: the route guard checks
 * this path as the workspace path it stands for, and the page below asks the
 * database again before it renders a single operational row. Anyone without a
 * working membership never reaches this file; the guard serves the public
 * preview at the same URL instead.
 */

export const metadata: Metadata = previewMetadata(
  TEAM_TITLE, TEAM_DESCRIPTION, "/shine/2026/team",
);

export default async function ShineTeamGuide() {
  return TeamGuidePage({ params: Promise.resolve(SHINE_2026) });
}
