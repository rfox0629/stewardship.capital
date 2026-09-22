import { notFound } from "next/navigation";

import { GuideApp } from "../guide-app";
import { loadGuide, loadTeam } from "../load";

/**
 * The weekend, for the team.
 *
 * Everything a guest sees, plus a Team destination with the run of show and
 * the volunteer duties. Reaching it takes a working membership: the route
 * guard refuses anyone else, and this page asks again rather than trusting
 * that it was asked. A different address is navigation, not permission.
 *
 * Seeing the team view does not make someone an editor. Only a planner gets
 * the way into the calendar and the duty checkboxes, and the server checks
 * that again on every change.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export const metadata = { title: "Team guide" };

export default async function TeamGuidePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const [loaded, team] = await Promise.all([
    loadGuide(clientSlug, eventSlug, edition),
    loadTeam(clientSlug, eventSlug, edition),
  ]);
  if (!loaded || !team) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;

  return (
    <GuideApp
      storeKey={`gd:${clientSlug}:${eventSlug}:${edition}:team`}
      startsOn={loaded.guide.startsOn}
      moments={loaded.guide.moments}
      activities={loaded.guide.activities}
      coffee={loaded.guide.coffee}
      team={{
        base,
        route: { clientSlug, eventSlug, edition },
        startsOn: loaded.guide.startsOn,
        moments: team.moments,
        prep: team.prep,
        statuses: team.statuses,
        canEdit: team.canEdit,
      }}
    />
  );
}
