import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Pill, Workflow } from "@spark/_components/ui";
import { shortDate } from "@spark/_lib/format";
import { editionPath } from "@spark/_lib/paths";
import type { EditionRouteParams } from "@spark/_lib/paths";
import {
  decisionsFor,
  meetingsFor,
  personById,
  resolveEdition,
  sparkById,
} from "@spark/_lib/store";

export const metadata = { title: "This week" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function MeetingPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  const meetings = meetingsFor(edition.id);
  const next = meetings[0];
  const past = meetings.slice(1);
  const decisions = decisionsFor(edition.id);
  const open = decisions.filter((decision) => decision.status === "open");
  const deferred = decisions.filter((decision) => decision.status === "deferred");
  const decided = decisions.filter((decision) => decision.status === "decided");

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Weekly meeting</p>
          <h1>{next ? next.title : "No meeting scheduled"}</h1>
          <p>{next ? next.note : "Add an agenda to start the cadence."}</p>
        </div>

        <Workflow here="Discuss" />

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            <Panel
              title="Sparks on this agenda"
              flush
              action={<Link href={base("sparks")}>All sparks</Link>}
            >
              <ul className="eo-rows">
                {(next?.sparkIds ?? []).map((sparkId) => {
                  const spark = sparkById(sparkId);
                  if (!spark) return null;
                  return (
                    <li key={sparkId}>
                      <div className="eo-row-main">
                        <div className="eo-row-title">
                          <Link href={`${base("sparks")}/${spark.id}`}>
                            {spark.title}
                          </Link>
                        </div>
                        <p className="eo-row-meta">
                          {spark.category}. Raised by {spark.raisedBy} on{" "}
                          {shortDate(spark.raisedOn)}.
                        </p>
                      </div>
                      <div className="eo-row-side">
                        <Pill tone={spark.status === "discussing" ? "warn" : "neutral"}>
                          {spark.status}
                        </Pill>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title="Decisions to make" flush>
              <ul className="eo-rows">
                {open.map((decision) => (
                  <li key={decision.id}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{decision.question}</div>
                      <p className="eo-row-meta">
                        {decision.context} Owner {personById(decision.ownerId).name}.
                        Needed by {shortDate(decision.needsBy)}.
                      </p>
                      {decision.sparkId ? (
                        <p className="eo-row-meta">
                          <Link
                            className="eo-panel-link"
                            href={`${base("sparks")}/${decision.sparkId}`}
                          >
                            Open the spark
                          </Link>
                        </p>
                      ) : null}
                    </div>
                    <div className="eo-row-side">
                      <Pill tone="warn">open</Pill>
                    </div>
                  </li>
                ))}
                {deferred.map((decision) => (
                  <li key={decision.id}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{decision.question}</div>
                      <p className="eo-row-meta">
                        {decision.context} Deferred to{" "}
                        {shortDate(decision.needsBy)}.
                      </p>
                    </div>
                    <div className="eo-row-side">
                      <Pill>deferred</Pill>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="eo-grid">
            <Panel title="How this meeting runs">
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {[
                  "Read the sparks. No debate yet.",
                  "Pick which sparks are worth discussing this week.",
                  "Make the decisions that are blocking work.",
                  "Approve, park, or decline. Every spark leaves with a state.",
                  "Approved sparks get built into schedule, budget, tasks, and supplies before anyone leaves.",
                ].map((step) => (
                  <li
                    key={step}
                    style={{
                      fontSize: "0.88rem",
                      color: "var(--eo-ink-soft)",
                      lineHeight: 1.55,
                      marginBottom: 7,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>
              <p className="eo-note" style={{ marginTop: 14 }}>
                Thirty minutes. If it runs long, the sparks were not written
                clearly enough.
              </p>
            </Panel>

            <Panel title="Already decided" flush>
              <ul className="eo-rows">
                {decided.map((decision) => (
                  <li key={decision.id}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{decision.question}</div>
                      <p className="eo-row-meta">{decision.outcome}</p>
                    </div>
                    <div className="eo-row-side">
                      <Pill tone="good">decided</Pill>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            {past.length > 0 ? (
              <Panel title="Previous meetings" flush>
                <ul className="eo-rows">
                  {past.map((meeting) => (
                    <li key={meeting.id}>
                      <div className="eo-row-main">
                        <div className="eo-row-title">{meeting.title}</div>
                        <p className="eo-row-meta">{meeting.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
