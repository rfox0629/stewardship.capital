import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";
import { CaptureForm, DecideControls } from "./spark-controls";

export const metadata = { title: "Sparks" };

/**
 * Capture freely. Discern carefully. Move intentionally.
 *
 * The page is the philosophy: three sections in that order, and the further
 * down the page an idea travels, the more it has earned. Nothing here is a
 * task. A spark that never becomes anything has still done its job.
 *
 * Rows come from the sparks table under the reader's own session; guests
 * never reach this page, and the planner's controls appear only for the
 * planner, with the same line enforced again in the action and again by RLS.
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

export default async function SparksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const route = { clientSlug, eventSlug, edition };
  const planner = context.role === "planner";

  const [{ data }, { data: builtRows }] = await Promise.all([
    context.supabase
      .from("sparks")
      .select("id, title, detail, category, status, raised_by_name, decision, created_at")
      .eq("engagement_id", context.engagement.id)
      .order("created_at", { ascending: false }),
    /* Where approved ideas have already landed. The provenance runs both
       ways: the schedule names its spark, and the spark names its moment. */
    context.supabase
      .from("schedule_items")
      .select("spark_id, day_key, starts_label, title")
      .eq("engagement_id", context.engagement.id)
      .not("spark_id", "is", null),
  ]);

  const sparks = (data ?? []) as SparkRow[];

  const DAY_NAMES: Record<string, string> = {
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  const becameBySpark = new Map<string, string[]>();
  for (const built of builtRows ?? []) {
    const key = String(built.spark_id);
    const label = `${DAY_NAMES[built.day_key] ?? built.day_key} ${built.starts_label}, ${built.title}`;
    becameBySpark.set(key, [...(becameBySpark.get(key) ?? []), label]);
  }
  const of = (...statuses: string[]) =>
    sparks.filter((spark) => statuses.includes(spark.status));

  const captured = of("captured");
  const discussing = of("discussing");
  const approved = of("approved");
  const rested = of("parked", "declined");

  const row = (spark: SparkRow, options: { muted?: boolean } = {}) => (
    <li key={spark.id} className={options.muted ? "ev-muted" : undefined}>
      <p className="ev-row-kicker">
        <span>{spark.category}</span>
        {spark.raised_by_name ? <span>{spark.raised_by_name}</span> : null}
        {spark.status === "parked" ? <span>Parked</span> : null}
        {spark.status === "declined" ? <span>Declined</span> : null}
      </p>
      <p className="ev-row-title">{spark.title}</p>
      {spark.detail ? <p className="ev-row-detail">{spark.detail}</p> : null}
      {spark.decision ? <p className="ev-row-decision">{spark.decision}</p> : null}
      {(becameBySpark.get(spark.id) ?? []).map((where) => (
        <p key={where} className="ev-row-became">
          On the schedule: {where}
        </p>
      ))}
      {planner ? (
        <DecideControls route={route} sparkId={spark.id} status={spark.status} />
      ) : null}
    </li>
  );

  return (
    <>
      <h2 className="ev-page-title">Sparks</h2>
      <p className="ev-lede">
        An idea, not an approval. Capture what comes to you and let it rest
        here; the team discerns together what the weekend should carry.
      </p>

      <section className="ev-section" aria-labelledby="capture-title">
        <div className="ev-section-head">
          <h3 className="ev-section-title" id="capture-title">
            Capture freely
          </h3>
          <span className="ev-section-note">
            {captured.length === 0
              ? "Nothing waiting"
              : `${captured.length} waiting`}
          </span>
        </div>
        <CaptureForm {...route} />
        {captured.length > 0 ? (
          <ul className="ev-rows">{captured.map((spark) => row(spark))}</ul>
        ) : null}
      </section>

      <section className="ev-section" aria-labelledby="discern-title">
        <div className="ev-section-head">
          <h3 className="ev-section-title" id="discern-title">
            Discern carefully
          </h3>
          <span className="ev-section-note">
            {discussing.length === 0
              ? "Nothing in discussion"
              : `${discussing.length} in discussion`}
          </span>
        </div>
        {discussing.length > 0 ? (
          <ul className="ev-rows">{discussing.map((spark) => row(spark))}</ul>
        ) : (
          <p className="ev-row-detail" style={{ paddingTop: 12 }}>
            When a captured idea is ready to be weighed, it moves here.
          </p>
        )}
      </section>

      <section className="ev-section" aria-labelledby="move-title">
        <div className="ev-section-head">
          <h3 className="ev-section-title" id="move-title">
            Move intentionally
          </h3>
          <span className="ev-section-note">
            {approved.length === 0
              ? "Nothing approved yet"
              : `${approved.length} approved`}
          </span>
        </div>
        {approved.length > 0 ? (
          <ul className="ev-rows">{approved.map((spark) => row(spark))}</ul>
        ) : (
          <p className="ev-row-detail" style={{ paddingTop: 12 }}>
            Approved sparks become schedule, budget, and hands on deck.
          </p>
        )}
      </section>

      {rested.length > 0 ? (
        <section className="ev-section" aria-labelledby="rest-title">
          <div className="ev-section-head">
            <h3 className="ev-section-title" id="rest-title">
              At rest
            </h3>
            <span className="ev-section-note">
              Parked for later, or set down with a reason
            </span>
          </div>
          <ul className="ev-rows">
            {rested.map((spark) => row(spark, { muted: true }))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
