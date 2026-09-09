import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";
import { QuestionQueue, type Question } from "./questions";

export const metadata = { title: "The weekend" };

/**
 * The screen a planning meeting opens on.
 *
 * Three numbers, a line for anything unresolved, a line for anything half
 * planned, and the way into the planner. Nothing here is a working surface:
 * the weekend is written down once, in the calendar, and this page says how
 * it stands and gets out of the way.
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
  const planner = context.role === "planner" || context.staff;

  const [ideasQ, actionsQ, budgetQ, needsQ, planLinksQ] = await Promise.all([
    supabase.from("sparks").select("id, title, detail, open_question, question_answer, status, tentative_day, tentative_daypart")
      .eq("engagement_id", engagement.id),
    supabase.from("tasks").select("status, estimated_cents").eq("engagement_id", engagement.id),
    /* The event ledger only. What SHINE buys and keeps is planned in Budget
       and is deliberately not measured against this weekend's ceiling. */
    supabase.from("budget_lines").select("planned_cents")
      .eq("engagement_id", engagement.id).neq("ledger", "equipment"),
    supabase.from("resources").select("estimated_cents").eq("engagement_id", engagement.id),
    /* What the approved ideas have so far, so the gaps can be counted. */
    Promise.all([
      supabase.from("schedule_items").select("spark_id").eq("engagement_id", engagement.id).not("spark_id", "is", null),
      supabase.from("tasks").select("spark_id").eq("engagement_id", engagement.id).not("spark_id", "is", null),
      supabase.from("resources").select("spark_id, status").eq("engagement_id", engagement.id).not("spark_id", "is", null),
    ]),
  ]);

  const ideas = ideasQ.data ?? [];
  const live = ideas.filter((row) => row.status !== "parked" && row.status !== "declined");
  const carrying = ideas.filter((row) => row.open_question && row.status !== "parked");
  const openActions = (actionsQ.data ?? []).filter((row) => row.status !== "done");

  const working =
    (budgetQ.data ?? []).reduce((total, row) => total + row.planned_cents, 0) +
    (actionsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0) +
    (needsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0);
  const available = engagement.budgetTotalCents - working;

  /* Approved ideas that are not yet carried out. Not a stage, just the
     count of loose ends after a fast round of decisions. */
  const [schedLinks, actionLinks, needLinks] = planLinksQ;
  const scheduled = new Set((schedLinks.data ?? []).map((row) => row.spark_id));
  const owned = new Set((actionLinks.data ?? []).map((row) => row.spark_id));
  const openNeed = new Set(
    (needLinks.data ?? []).filter((row) => row.status === "needed").map((row) => row.spark_id),
  );
  /* An idea is in the plan when something has come of it. Loose ends are
     the parts it is still missing, counted over exactly those ideas. */
  const inPlan = ideas.filter(
    (row) => row.status !== "parked" && (scheduled.has(row.id) || owned.has(row.id) || openNeed.has(row.id)),
  );
  const planning = {
    total: inPlan.length,
    noTime: inPlan.filter((row) => !scheduled.has(row.id)).length,
    noOwner: inPlan.filter((row) => !owned.has(row.id)).length,
    openNeed: inPlan.filter((row) => openNeed.has(row.id)).length,
  };
  const looseEnds = planning.noTime + planning.noOwner + planning.openNeed;

  /* Open questions are not among these. They have their own line below, and
     a number that is also the way to answer it does not need saying twice. */
  const figures = [
    { value: String(live.length), label: "Ideas", href: `${base}/plan` },
    { value: String(openActions.length), label: "Open actions", href: `${base}/actions` },
    { value: money(available), label: "Available", href: `${base}/budget`, over: available < 0 },
  ];


  return (
    <div className="wk">
      <div className="wk-figures">
        {figures.map((figure) => (
          <Link
            key={figure.label}
            href={figure.href}
            className={`wk-figure ${figure.over ? "wk-figure-over" : ""}`}
          >
            <b>{figure.value}</b>
            <span>{figure.label}</span>
          </Link>
        ))}
      </div>

      <QuestionQueue
        questions={carrying.map((row): Question => ({
          id: row.id,
          title: row.title,
          question: row.open_question as string,
        }))}
        route={{ clientSlug, eventSlug, edition }}
        base={base}
        planner={planner}
      />

      {planning.total > 0 && looseEnds > 0 ? (
        <Link href={`${base}/plan?show=planned`} className="wk-loose" aria-label="Needs planning">
          <b>Needs planning</b>
          <span>{planning.total} in the plan</span>
          {planning.noTime > 0 ? <em>{planning.noTime} without a time</em> : null}
          {planning.noOwner > 0 ? <em>{planning.noOwner} without an owner</em> : null}
          {planning.openNeed > 0 ? (
            <em>{planning.openNeed} requirement{planning.openNeed === 1 ? "" : "s"} open</em>
          ) : null}
          <i aria-hidden="true">→</i>
        </Link>
      ) : null}

      {/* The weekend itself is one click away and is the only place it is
          written down. Repeating it here as text was a second itinerary to
          keep in step with the first, and it always lost.

          The reference libraries left this page for the same reason. The
          drinks belong in the idea that has to choose one, the property's
          amenities belong in the block that might offer them, and the tent
          concepts belong wherever they are being used. On a home page they
          were three large doors competing with the plan. */}
      <Link className="wk-open-planner" href={`${base}/schedule`}>
        <b>Open the planner</b>
        <span>Ideas, what still needs a time, and the calendar itself</span>
        <i aria-hidden="true">&rarr;</i>
      </Link>

</div>
  );
}
