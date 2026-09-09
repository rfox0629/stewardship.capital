import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "The weekend" };

/**
 * What this weekend is, and the way into planning it.
 *
 * Everything operational used to live here: four numbers, a queue of open
 * questions with its own answering flow, and a loose ends line. All of it was
 * a second reading of state that Plan holds better, and it put a dashboard in
 * front of the screen a planning meeting actually works on.
 *
 * So this page stopped competing. Plan is the room's screen; this is the page
 * that says which weekend it is and sends you there. The two figures that
 * remain are the ones Plan does not carry: what is owed to people, and what
 * is left of the money. Nothing was deleted underneath. Every open question
 * is still on its idea, answerable in Plan where the rest of that idea is.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function WeekendPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { engagement, supabase } = context;

  const [questionsQ, momentsQ, actionsQ, budgetQ, needsQ] = await Promise.all([
    supabase.from("sparks").select("id, status, open_question").eq("engagement_id", engagement.id),
    supabase.from("schedule_items").select("id").eq("engagement_id", engagement.id),
    supabase.from("tasks").select("status, estimated_cents").eq("engagement_id", engagement.id),
    /* What spends this weekend's money. A purchase funded from elsewhere, or
       named inside an allocation, is not more spending; both are excluded the
       same way Budget excludes them. */
    supabase.from("budget_lines").select("planned_cents")
      .eq("engagement_id", engagement.id)
      .eq("counts_toward_budget", true)
      .is("parent_id", null),
    supabase.from("resources").select("estimated_cents").eq("engagement_id", engagement.id),
  ]);

  const carrying = (questionsQ.data ?? []).filter(
    (row) => row.open_question && row.status !== "parked",
  ).length;
  const moments = (momentsQ.data ?? []).length;
  const openActions = (actionsQ.data ?? []).filter((row) => row.status !== "done").length;

  const working =
    (budgetQ.data ?? []).reduce((total, row) => total + row.planned_cents, 0) +
    (actionsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0) +
    (needsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0);
  const available = engagement.budgetTotalCents - working;

  return (
    <div className="wk">
      {/* One destination, said once, and the state of the plan as a sentence
          on the way in rather than a panel to work through first. */}
      <Link className="wk-open-planner" href={`${base}/schedule`}>
        <b>Open Plan</b>
        <span>
          The calendar, the ideas waiting on it
          {moments > 0 ? `, ${moments} moments so far` : ""}
          {carrying > 0
            ? `, and ${carrying} ${carrying === 1 ? "idea" : "ideas"} still carrying a question`
            : ""}
        </span>
        <i aria-hidden="true">&rarr;</i>
      </Link>

      <p className="wk-plan-note">
        Plan is where this weekend is built. What follows is only what Plan does not carry.
      </p>

      <div className="wk-figures">
        <Link href={`${base}/actions`} className="wk-figure">
          <b>{openActions}</b>
          <span>Open actions</span>
        </Link>
        <Link href={`${base}/budget`} className={`wk-figure ${available < 0 ? "wk-figure-over" : ""}`}>
          <b>{money(available)}</b>
          <span>{available < 0 ? "Over budget" : "Available"}</span>
        </Link>
      </div>
    </div>
  );
}
