import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";
import { ActionList, type Action, type Need } from "./list";

export const metadata = { title: "Actions" };

/**
 * What needs to happen before and during the weekend, and what the weekend
 * needs to have. Both come from the same question, so they share a screen.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export default async function ActionsPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const planner = context.role === "planner" || context.staff;
  const engagementId = context.engagement.id;

  const [actionsQ, needsQ] = await Promise.all([
    context.supabase
      .from("tasks")
      .select("id, title, owner_name, due_on, status, spark_id, spark:sparks(title)")
      .eq("engagement_id", engagementId)
      .order("due_on", { ascending: true, nullsFirst: false }),
    context.supabase
      .from("resources")
      .select("id, name, kind, status, estimated_cents, spark_id, spark:sparks(title)")
      .eq("engagement_id", engagementId)
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const from = (
    sparkId: string | null,
    spark: { title: string } | { title: string }[] | null,
  ) => {
    const title = (Array.isArray(spark) ? spark[0] : spark)?.title;
    return sparkId && title ? { label: title, href: `${base}/plan?open=${sparkId}` } : null;
  };

  const actions: Action[] = ((actionsQ.data ?? []) as Array<{
    id: string; title: string; owner_name: string | null; due_on: string | null;
    status: string; spark_id: string | null; spark: { title: string } | { title: string }[] | null;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    owner: row.owner_name,
    due: row.due_on,
    status: row.status,
    from: from(row.spark_id, row.spark),
  }));

  const needs: Need[] = ((needsQ.data ?? []) as Array<{
    id: string; name: string; kind: string; status: string; estimated_cents: number;
    spark_id: string | null; spark: { title: string } | { title: string }[] | null;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    costCents: row.estimated_cents,
    from: from(row.spark_id, row.spark),
  }));

  return (
    <>
      <h2 className="ws-title">Actions</h2>
      <ActionList
        actions={actions}
        needs={needs}
        route={{ clientSlug, eventSlug, edition }}
        planner={planner}
      />
    </>
  );
}
