import { notFound, redirect } from "next/navigation";

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
 * Two ledgers share the table. What this weekend costs is measured against
 * the engagement's ceiling; what SHINE buys and keeps is planned here and
 * deliberately outside it. Which one a line belongs to is a single field, so
 * reclassifying is a decision rather than a migration.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export default async function BudgetPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const engagementId = context.engagement.id;
  const [linesQ, ideasQ] = await Promise.all([
    context.supabase
      .from("budget_lines")
      .select(
        "id, ledger, category, label, planned_cents, committed_cents, actual_cents, status, note, vendor, source_url, owner_name, spark_id, review_of",
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
