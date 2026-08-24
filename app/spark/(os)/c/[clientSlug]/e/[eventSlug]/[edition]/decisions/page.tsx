import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Decisions" };

/**
 * The discernment trail.
 *
 * A decision here is a question with a written answer, never a toggle. What
 * was decided and why stays on the page after the deciding, because six weeks
 * later "why did we say no to Sunday programming" is a question someone will
 * ask, and the answer should not live in anyone's memory.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type DecisionRow = {
  id: string;
  question: string;
  context: string | null;
  owner_name: string | null;
  status: string;
  outcome: string | null;
  needs_by: string | null;
  spark: { title: string } | { title: string }[] | null;
};

const needsBy = (value: string | null) => {
  if (!value) return null;
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const sparkTitle = (row: DecisionRow) =>
  (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title;

export default async function DecisionsPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { data } = await context.supabase
    .from("decisions")
    .select("id, question, context, owner_name, status, outcome, needs_by, spark:sparks(title)")
    .eq("engagement_id", context.engagement.id)
    .order("needs_by", { ascending: true, nullsFirst: false });

  const decisions = (data ?? []) as DecisionRow[];
  const open = decisions.filter((row) => row.status === "open");
  const deferred = decisions.filter((row) => row.status === "deferred");
  const decided = decisions.filter((row) => row.status === "decided");

  const row = (decision: DecisionRow, options: { muted?: boolean } = {}) => (
    <li key={decision.id} className={options.muted ? "ev-muted" : undefined}>
      <p className="ev-row-kicker">
        {decision.owner_name ? <span>{decision.owner_name}</span> : null}
        {decision.status !== "decided" && decision.needs_by ? (
          <span>Needed by {needsBy(decision.needs_by)}</span>
        ) : null}
      </p>
      <p className="ev-row-title">{decision.question}</p>
      {decision.context ? (
        <p className="ev-row-detail">{decision.context}</p>
      ) : null}
      {decision.outcome ? (
        <p className="ev-row-decision">{decision.outcome}</p>
      ) : null}
      {sparkTitle(decision) ? (
        <p className="ev-row-became">From the spark: {sparkTitle(decision)}</p>
      ) : null}
    </li>
  );

  return (
    <>
      <h2 className="ev-page-title">Decisions</h2>
      <p className="ev-lede">
        What has been asked, what has been answered, and why. The written
        reason stays with the answer.
      </p>

      <section className="ev-section" aria-label="Open decisions">
        <div className="ev-section-head">
          <h3 className="ev-section-title">Being weighed</h3>
          <span className="ev-section-note">
            {open.length === 0 ? "Nothing open" : `${open.length} open`}
          </span>
        </div>
        {open.length > 0 ? (
          <ul className="ev-rows">{open.map((decision) => row(decision))}</ul>
        ) : (
          <p className="ev-row-detail" style={{ paddingTop: 12 }}>
            Nothing is waiting on an answer.
          </p>
        )}
      </section>

      {deferred.length > 0 ? (
        <section className="ev-section" aria-label="Deferred decisions">
          <div className="ev-section-head">
            <h3 className="ev-section-title">Set aside for now</h3>
            <span className="ev-section-note">
              Waiting on something else first
            </span>
          </div>
          <ul className="ev-rows">
            {deferred.map((decision) => row(decision))}
          </ul>
        </section>
      ) : null}

      {decided.length > 0 ? (
        <section className="ev-section" aria-label="Settled decisions">
          <div className="ev-section-head">
            <h3 className="ev-section-title">Settled</h3>
            <span className="ev-section-note">The answer, and the why</span>
          </div>
          <ul className="ev-rows">
            {decided.map((decision) => row(decision))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
