import { notFound, redirect } from "next/navigation";
import { publicPath } from "@lib/spark/href";

import type { Line } from "@lib/spark/budget";
import { resolveEngagement } from "@lib/spark/engagement";

import { BudgetLedger } from "./ledger";

export const metadata = { title: "Budget" };

/**
 * The money.
 *
 * Every cost in the product is a budget line, including the ones entered on
 * an idea, which carry that idea's id. Nothing else in the plan holds money:
 * an action can explain a cost and a requirement can be the reason for one,
 * but neither carries the number, so the same money cannot be counted twice.
 *
 * A line answers two questions that are not the same question: does it spend
 * this engagement's budget, and does SHINE keep the thing afterwards. Neither
 * is derived from the other. A purchase named inside an allocation is detail
 * about money already counted, and is never added to a total twice.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export default async function BudgetPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  /* The route stays as it is; the address people see follows the domain. */
  const href = await publicPath(base);
  if (context.role === "stakeholder") redirect(`${href}/schedule`);

  const engagementId = context.engagement.id;
  const [linesQ, ideasQ] = await Promise.all([
    context.supabase
      .from("budget_lines")
      .select(
        "id, kind, category, label, planned_cents, committed_cents, actual_cents, status, note, vendor, source_url, owner_name, spark_id, counts_toward_budget, reusable, reuse_note, parent_id",
      )
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    context.supabase.from("sparks").select("id, title").eq("engagement_id", engagementId),
  ]);

  const lines = (linesQ.data ?? []) as Line[];
  const ideaTitles = Object.fromEntries(
    (ideasQ.data ?? []).map((row) => [row.id, row.title as string]),
  );

  return (
    <BudgetLedger
      lines={lines}
      ceilingCents={context.engagement.budgetTotalCents}
      route={{ clientSlug, eventSlug, edition }}
      planner={context.role === "planner" || context.staff}
      ideaTitles={ideaTitles}
    />
  );
}
