import { notFound, redirect } from "next/navigation";
import { publicPath } from "@lib/spark/href";

import { resolveEngagement } from "@lib/spark/engagement";
import { gatherIdeas } from "@lib/spark/ideas";
import { IdeaBoard } from "./board";

export const metadata = { title: "Plan" };

/**
 * Everything each idea has become, gathered in one pass.
 *
 * The idea is the anchor, so this reads outward from it: the moments it is,
 * the moments it sits inside, the actions carrying it, what it requires, what
 * it costs, and the notes about it. Rows come through the reader's own
 * session, so a guest never arrives here.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export default async function PlanPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  /* The route stays as it is; the address people see follows the domain. */
  const href = await publicPath(base);
  if (context.role === "stakeholder") redirect(`${href}/schedule`);

  const planner = context.role === "planner" || context.staff;
  const engagementId = context.engagement.id;
  const supabase = context.supabase;

  const { ideas, momentOptions } = await gatherIdeas(supabase, engagementId, base, planner);

  return (
    <IdeaBoard
      ideas={ideas}
      route={{ clientSlug, eventSlug, edition }}
      planner={planner}
      moments={momentOptions}
    />
  );
}
