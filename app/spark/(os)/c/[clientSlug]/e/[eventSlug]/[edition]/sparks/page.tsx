import { notFound, redirect } from "next/navigation";

import { DAY_NAMES, parseTimeLabel } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { AddToPlan } from "./add-to-plan";
import { CaptureForm, DecideControls } from "./spark-controls";

export const metadata = { title: "Sparks" };

/**
 * The pipeline is the philosophy, laid on its side.
 *
 * Three lanes: Capture freely, where an idea costs a sentence. Discern
 * carefully, where the team weighs, prays, combines, parks, declines.
 * Move intentionally, where an approved idea is placed into the plan by a
 * person, one destination at a time.
 *
 * Deliberately no further stages. Spark is not where execution is tracked:
 * what happens after an idea moves lives in the schedule, tasks, budget,
 * resources, decisions, and run of show, each carrying the spark's name so
 * the idea is traceable everywhere and typed nowhere twice.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type SparkRow = {
  id: string;
  title: string;
  detail: string | null;
  category: string;
  status: string;
  raised_by_name: string | null;
  decision: string | null;
  created_at: string;
};

type Downstream = { kind: string; label: string };

export default async function SparksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const route = { clientSlug, eventSlug, edition };
  const planner = context.role === "planner" || context.staff;
  const engagementId = context.engagement.id;

  const [sparksQ, scheduleQ, tasksQ, budgetQ, resourcesQ, decisionsQ, cuesQ] =
    await Promise.all([
      context.supabase
        .from("sparks")
        .select("id, title, detail, category, status, raised_by_name, decision, created_at")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("schedule_items")
        .select("id, spark_id, day_key, starts_label, title")
        .eq("engagement_id", engagementId),
      context.supabase
        .from("tasks")
        .select("spark_id, title")
        .eq("engagement_id", engagementId)
        .not("spark_id", "is", null),
      context.supabase
        .from("budget_lines")
        .select("spark_id, label, planned_cents")
        .eq("engagement_id", engagementId)
        .not("spark_id", "is", null),
      context.supabase
        .from("resources")
        .select("spark_id, name")
        .eq("engagement_id", engagementId)
        .not("spark_id", "is", null),
      context.supabase
        .from("decisions")
        .select("spark_id, question")
        .eq("engagement_id", engagementId)
        .not("spark_id", "is", null),
      planner
        ? context.supabase
            .from("run_of_show_cues")
            .select("spark_id, at_label, cue")
            .eq("engagement_id", engagementId)
            .not("spark_id", "is", null)
        : Promise.resolve({ data: [] as Array<{ spark_id: string; at_label: string; cue: string }> }),
    ]);

  const sparks = (sparksQ.data ?? []) as SparkRow[];

  /* Everything each spark has already become, gathered once. */
  const downstream = new Map<string, Downstream[]>();
  const push = (sparkId: string | null, kind: string, label: string) => {
    if (!sparkId) return;
    downstream.set(sparkId, [...(downstream.get(sparkId) ?? []), { kind, label }]);
  };
  for (const row of scheduleQ.data ?? []) {
    if (row.spark_id) {
      push(row.spark_id, "Schedule", `${DAY_NAMES[row.day_key] ?? row.day_key} ${row.starts_label}, ${row.title}`);
    }
  }
  for (const row of tasksQ.data ?? []) push(row.spark_id, "Task", row.title);
  for (const row of budgetQ.data ?? [])
    push(row.spark_id, "Budget", `${row.label}, $${Math.round(row.planned_cents / 100).toLocaleString()}`);
  for (const row of resourcesQ.data ?? []) push(row.spark_id, "Resource", row.name);
  for (const row of decisionsQ.data ?? []) push(row.spark_id, "Decision", row.question);
  for (const row of (cuesQ.data ?? []) as Array<{ spark_id: string; at_label: string; cue: string }>)
    push(row.spark_id, "Run of show", `${row.at_label}, ${row.cue}`);

  /* Destinations for run of show cues need a moment to attach to. */
  const scheduleMoments = ((scheduleQ.data ?? []) as Array<{ id: string; day_key: string; starts_label: string; title: string }>)
    .sort(
      (a, b) =>
        a.day_key.localeCompare(b.day_key) ||
        (parseTimeLabel(a.starts_label) ?? 9999) - (parseTimeLabel(b.starts_label) ?? 9999),
    )
    .map((row) => ({
      id: row.id,
      label: `${DAY_NAMES[row.day_key] ?? row.day_key} ${row.starts_label}, ${row.title}`,
    }));

  const of = (...statuses: string[]) => sparks.filter((s) => statuses.includes(s.status));
  const captured = of("captured");
  const discussing = of("discussing");
  const approved = of("approved");
  const rested = of("parked", "declined");

  const card = (spark: SparkRow, options: { muted?: boolean } = {}) => {
    const became = downstream.get(spark.id) ?? [];
    return (
      <li key={spark.id} className={`ev-card ${options.muted ? "ev-muted" : ""}`}>
        <p className="ev-card-kicker">
          <span>{spark.category}</span>
          {spark.raised_by_name ? <span>{spark.raised_by_name}</span> : null}
          {spark.status === "parked" ? <span>Parked</span> : null}
          {spark.status === "declined" ? <span>Declined</span> : null}
        </p>
        <p className="ev-card-title">{spark.title}</p>
        {spark.detail ? <p className="ev-card-detail">{spark.detail}</p> : null}
        {spark.decision ? <p className="ev-row-decision">{spark.decision}</p> : null}
        {became.length > 0 ? (
          <ul className="ev-card-links">
            {became.map((link, index) => (
              <li key={index}>
                <b>{link.kind}</b> {link.label}
              </li>
            ))}
          </ul>
        ) : null}
        {planner ? (
          <DecideControls route={route} sparkId={spark.id} status={spark.status} />
        ) : null}
        {planner && spark.status === "approved" ? (
          <AddToPlan
            route={route}
            sparkId={spark.id}
            sparkTitle={spark.title}
            scheduleMoments={scheduleMoments}
          />
        ) : null}
      </li>
    );
  };

  return (
    <>
      <h2 className="ev-page-title">Sparks</h2>
      <p className="ev-lede">
        An idea, not an approval. Capture what comes to you; the team discerns
        together what the weekend should carry, and what is approved is placed
        into the plan by hand.
      </p>

      <div className="ev-board">
        <section className="ev-col" aria-labelledby="col-capture">
          <div className="ev-col-head">
            <h3 className="ev-section-title" id="col-capture">Capture freely</h3>
            <span className="ev-section-note">{captured.length}</span>
          </div>
          <details className="ev-capture-fold">
            <summary>Capture an idea</summary>
            <CaptureForm {...route} />
          </details>
          <ul className="ev-cards">{captured.map((spark) => card(spark))}</ul>
        </section>

        <section className="ev-col" aria-labelledby="col-discern">
          <div className="ev-col-head">
            <h3 className="ev-section-title" id="col-discern">Discern carefully</h3>
            <span className="ev-section-note">{discussing.length}</span>
          </div>
          <ul className="ev-cards">{discussing.map((spark) => card(spark))}</ul>
          {rested.length > 0 ? (
            <details className="ev-rested">
              <summary>At rest, {rested.length}</summary>
              <ul className="ev-cards">
                {rested.map((spark) => card(spark, { muted: true }))}
              </ul>
            </details>
          ) : null}
        </section>

        <section className="ev-col" aria-labelledby="col-move">
          <div className="ev-col-head">
            <h3 className="ev-section-title" id="col-move">Move intentionally</h3>
            <span className="ev-section-note">{approved.length}</span>
          </div>
          <ul className="ev-cards">{approved.map((spark) => card(spark))}</ul>
        </section>
      </div>
    </>
  );
}
