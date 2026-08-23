import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Pill, Stat } from "@events/_components/ui";
import { dayLabel, money, shortDate } from "@events/_lib/format";
import { Restricted } from "@events/_components/restricted";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import {
  budgetRollup,
  decisionsFor,
  editionById,
  personById,
  resolveEdition,
  resourcesFor,
  scheduleCounts,
  sparkCounts,
  tasksFor,
} from "@events/_lib/store";
import { canView } from "@events/_lib/viewer";
import { readViewer } from "@events/_lib/viewer-server";

export const metadata = { title: "Event plan" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function EventPlanPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const viewer = await readViewer();
  if (!canView(viewer, "plan")) {
    return (
      <Restricted
        role={viewer}
        section="plan"
        home={editionPath(client.slug, event.slug, edition.slug)}
      />
    );
  }
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  const rollup = budgetRollup(edition.id);
  const schedule = scheduleCounts(edition.id);
  const sparks = sparkCounts(edition.id);
  const decided = decisionsFor(edition.id).filter(
    (decision) => decision.status === "decided",
  );
  const owners = Array.from(
    new Set(tasksFor(edition.id).map((task) => task.ownerId)),
  );
  const previous = edition.reusedFromEditionId
    ? editionById(edition.reusedFromEditionId)
    : undefined;

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Event plan</p>
          <h1>{edition.label}</h1>
          <p>
            One page that says what this gathering is, who owns what, and what
            has already been settled. Everything else is a focused view.
          </p>
        </div>

        <dl className="eo-stats">
          <Stat
            label="Dates"
            value={`${shortDate(edition.startDate)} to ${shortDate(edition.endDate)}`}
            note={edition.location}
          />
          <Stat label="Budget" value={money(rollup.planned)} note={edition.venue} />
          <Stat
            label="Schedule"
            value={`${schedule.confirmed} of ${schedule.total}`}
            note="confirmed"
          />
          <Stat label="Guests" value={String(edition.guestsExpected)} note="expected" />
        </dl>

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            <Panel title="The shape of the weekend" flush>
              <ul className="eo-rows">
                {edition.days.map((day) => (
                  <li key={day.key}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{dayLabel(day.date)}</div>
                      <p className="eo-row-meta">{day.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Already settled" flush action={<Link href={base("meeting")}>Decisions</Link>}>
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
          </div>

          <div className="eo-grid">
            <Panel title="Who owns what" flush>
              <ul className="eo-rows">
                <li>
                  <div className="eo-row-main">
                    <div className="eo-row-title">
                      {personById(edition.coordinatorId).name}
                    </div>
                    <p className="eo-row-meta">
                      Event coordinator. Owns the plan end to end.
                    </p>
                  </div>
                </li>
                <li>
                  <div className="eo-row-main">
                    <div className="eo-row-title">{personById(edition.emceeId).name}</div>
                    <p className="eo-row-meta">
                      Emcee. Opens, frames, and hands off. Not a speaker.
                    </p>
                  </div>
                </li>
                {owners
                  .filter(
                    (id) => id !== edition.coordinatorId && id !== edition.emceeId,
                  )
                  .map((id) => {
                    const person = personById(id);
                    const count = tasksFor(edition.id).filter(
                      (task) => task.ownerId === id && task.status !== "done",
                    ).length;
                    return (
                      <li key={id}>
                        <div className="eo-row-main">
                          <div className="eo-row-title">{person.name}</div>
                          <p className="eo-row-meta">
                            {person.role}. {count} open tasks.
                          </p>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </Panel>

            <Panel title="Where this edition came from">
              {previous ? (
                <>
                  <p>
                    Reused from {previous.label}. The review from that edition
                    carried five items into this plan.
                  </p>
                  <p style={{ marginTop: 12 }}>
                    <Link className="eo-panel-link" href={base("review")}>
                      Open the impact review
                    </Link>
                  </p>
                </>
              ) : (
                <p>
                  First edition. Everything learned here becomes the starting
                  point for the next one.
                </p>
              )}
              <p className="eo-note" style={{ marginTop: 14 }}>
                {sparks.total} sparks raised, {sparks.approved} approved,{" "}
                {resourcesFor(edition.id).length} resources tracked.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
