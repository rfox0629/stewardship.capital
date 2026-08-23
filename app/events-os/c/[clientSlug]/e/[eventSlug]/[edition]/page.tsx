import Link from "next/link";
import { notFound } from "next/navigation";

import { EventScene } from "@events/_components/event-scene";
import { NodeState } from "@events/_components/node-state";
import { Meter, Panel, Pill, Stat } from "@events/_components/ui";
import { dayLabel, money, percent, shortDate } from "@events/_lib/format";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import {
  attentionFor,
  budgetRollup,
  decisionsFor,
  meetingsFor,
  personById,
  resolveEdition,
  scheduleCounts,
  scheduleFor,
  sparkCounts,
  sparksFor,
  taskCounts,
} from "@events/_lib/store";
import type { Client, Edition, EventDefinition } from "@events/_lib/types";
import { readViewer } from "@events/_lib/viewer-server";

type PageProps = { params: Promise<EditionRouteParams> };

export async function generateMetadata({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, edition);
  return { title: resolved ? resolved.edition.label : "Event" };
}

type LensProps = {
  client: Client;
  event: EventDefinition;
  edition: Edition;
  base: (segment: string) => string;
  home: string;
};

/**
 * The event home, through three lenses.
 *
 * The four questions the founder brief locked are the planner's four
 * questions. A client and a guest are owed answers too, but not the same ones,
 * and pretending otherwise is how a service product turns into a dashboard
 * everybody has to be trained on.
 */
export default async function EventHomePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const viewer = await readViewer();

  const home = editionPath(client.slug, event.slug, edition.slug);
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  const props: LensProps = { client, event, edition, base, home };

  if (viewer === "stakeholder") return <StakeholderHome {...props} />;
  if (viewer === "client") return <ClientHome {...props} />;
  return <PlannerHome {...props} />;
}

/* -------------------------------------------------------------------- hero */

/**
 * The emotional layer, owned by the client and the event rather than by Spark.
 * The same component for all three lenses. What changes is the sentence under
 * the name, because a planner and a guest are not standing in the same place.
 */
function Hero({
  client,
  edition,
  line,
  facts,
}: {
  client: Client;
  edition: Edition;
  line: string;
  facts: "full" | "guest";
}) {
  return (
    <section className="eo-hero">
      <div className="eo-hero-art">
        <EventScene theme={edition.theme} />
      </div>
      <div className="eo-hero-inner">
        <p className="eo-eyebrow eo-hero-client">{client.name}</p>
        <h1 className="eo-serif">{edition.label}</h1>
        <p>{line}</p>
        <div className="eo-hero-facts">
          <span>
            {shortDate(edition.startDate)} to {shortDate(edition.endDate)}
          </span>
          <span>{edition.location}</span>
          <span>{edition.venue}</span>
          {facts === "full" ? (
            <>
              <span>{edition.guestsExpected} guests expected</span>
              <span>Coordinator {personById(edition.coordinatorId).name}</span>
              <span>Emcee {personById(edition.emceeId).name}</span>
            </>
          ) : (
            <span>Hosted by {client.name}</span>
          )}
        </div>
      </div>
    </section>
  );
}

/** Confirmed items for one day. Used by both client facing lenses. */
function ConfirmedDay({
  edition,
  dayKey,
  heading,
  note,
}: {
  edition: Edition;
  dayKey: string;
  heading: string;
  note: string;
}) {
  const items = scheduleFor(edition.id).filter(
    (item) => item.dayKey === dayKey && item.status === "confirmed",
  );

  return (
    <>
      <div className="eo-day-head">
        <h2>{heading}</h2>
        <p>{note}</p>
      </div>
      {items.map((item) => (
        <div className="eo-slot" key={item.id} data-status="confirmed">
          <span className="eo-slot-time">{item.start}</span>
          <span className="eo-slot-title">
            <span
              className={`eo-track-dot eo-track-${item.track}`}
              aria-hidden="true"
            />
            {item.title}
          </span>
          <p className="eo-slot-meta">{item.location}</p>
        </div>
      ))}
      {items.length === 0 ? (
        <div className="eo-slot">
          <p className="eo-empty">Nothing confirmed for this day yet.</p>
        </div>
      ) : null}
    </>
  );
}

/* ----------------------------------------------------------------- planner */

function PlannerHome({ client, event, edition, base, home }: LensProps) {
  const rollup = budgetRollup(edition.id);
  const sparks = sparkCounts(edition.id);
  const schedule = scheduleCounts(edition.id);
  const tasks = taskCounts(edition.id);

  const attention = attentionFor(edition.id, {
    sparks: base("sparks"),
    schedule: base("schedule"),
    budget: base("budget"),
    tasks: base("tasks"),
    meeting: base("meeting"),
    resources: base("resources"),
  });

  const meeting = meetingsFor(edition.id)[0];
  const openDecisions = decisionsFor(edition.id).filter(
    (decision) => decision.status === "open",
  );
  const allSparks = sparksFor(edition.id);
  const nextDay = edition.days[0];
  const firstDayItems = scheduleFor(edition.id).filter(
    (item) => item.dayKey === nextDay.key,
  );

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <Hero client={client} edition={edition} line={event.summary} facts="full" />

        <dl className="eo-stats">
          <Stat
            label="Budget"
            value={money(rollup.planned)}
            note={`${percent(rollup.committed, rollup.planned)} percent committed`}
          />
          <Stat
            label="Schedule"
            value={`${schedule.confirmed} of ${schedule.total}`}
            note={`${schedule.draft} still draft`}
          />
          <Stat
            label="Sparks"
            value={String(sparks.total)}
            note={`${sparks.discussing + sparks.captured} waiting on us`}
          />
          <Stat
            label="Tasks"
            value={`${tasks.open} open`}
            note={`${tasks.blocked} blocked`}
          />
        </dl>

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            <Panel
              title="What needs attention"
              flush
              action={<Link href={base("tasks")}>All tasks</Link>}
            >
              <ul className="eo-attention">
                {attention.map((item) => (
                  <li key={item.id} data-tone={item.tone}>
                    <span className="eo-attention-dot" aria-hidden="true" />
                    <div className="eo-row-main">
                      <div className="eo-attention-label">
                        {item.href ? (
                          <Link href={item.href}>{item.label}</Link>
                        ) : (
                          item.label
                        )}
                      </div>
                      <p className="eo-attention-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="What we are deciding this week"
              flush
              action={<Link href={base("meeting")}>Open the meeting</Link>}
            >
              <ul className="eo-rows">
                {openDecisions.map((decision) => (
                  <li key={decision.id}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{decision.question}</div>
                      <p className="eo-row-meta">
                        {personById(decision.ownerId).name} owns it. Needed by{" "}
                        {shortDate(decision.needsBy)}.
                      </p>
                    </div>
                    <div className="eo-row-side">
                      <Pill tone="warn">open</Pill>
                    </div>
                  </li>
                ))}
                {openDecisions.length === 0 ? (
                  <li>
                    <p className="eo-empty">Nothing open. Good week.</p>
                  </li>
                ) : null}
              </ul>
            </Panel>
          </div>

          <div className="eo-grid">
            <Panel
              title="Are we on track"
              action={<Link href={base("budget")}>Budget</Link>}
            >
              <p className="eo-row-meta" style={{ marginTop: 0 }}>
                {money(rollup.actual)} spent, {money(rollup.committed)} committed,{" "}
                {money(rollup.planned)} planned.
              </p>
              <div style={{ marginTop: 12 }}>
                <Meter
                  actual={rollup.actual}
                  committed={rollup.committed}
                  planned={rollup.planned}
                />
              </div>
              <p className="eo-note" style={{ marginTop: 10 }}>
                {money(rollup.uncommitted)} of the plan is still uncommitted.
              </p>
            </Panel>

            <Panel
              title="What is confirmed"
              flush
              action={<Link href={base("schedule")}>Full schedule</Link>}
            >
              <div className="eo-day-head">
                <h2>{dayLabel(nextDay.date)}</h2>
                <p>{nextDay.note}</p>
              </div>
              {firstDayItems.map((item) => (
                <div className="eo-slot" key={item.id} data-status={item.status}>
                  <span className="eo-slot-time">{item.start}</span>
                  <span className="eo-slot-title">
                    <span
                      className={`eo-track-dot eo-track-${item.track}`}
                      aria-hidden="true"
                    />
                    {item.title}
                    {item.status === "draft" ? <Pill tone="warn">draft</Pill> : null}
                  </span>
                  <p className="eo-slot-meta">{item.location}</p>
                </div>
              ))}
            </Panel>

            {meeting ? (
              <Panel
                title="Next planning meeting"
                action={<Link href={base("meeting")}>Open</Link>}
              >
                <div className="eo-row-title">{meeting.title}</div>
                <p className="eo-row-meta">{meeting.note}</p>
                <p className="eo-note" style={{ marginTop: 10 }}>
                  {meeting.sparkIds.length} sparks and {meeting.decisionIds.length}{" "}
                  decisions on the agenda.
                </p>
              </Panel>
            ) : null}
          </div>
        </div>

        <p className="eo-section-title">Quick moves</p>
        <div className="eo-grid eo-grid-3">
          <Panel title="Capture a spark">
            <p className="eo-note">
              Ideas go to Sparks, never straight into the plan. Nothing here
              clutters the confirmed schedule until someone approves it.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="eo-panel-link" href={base("sparks")}>
                Open the Sparks board, {allSparks.length} total
              </Link>
            </p>
          </Panel>
          <Panel title="Read the plan">
            <p className="eo-note">
              The single page that says what this gathering is, who owns what,
              and what is settled.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="eo-panel-link" href={base("plan")}>
                Open the event plan
              </Link>
            </p>
          </Panel>
          <Panel title="Reflect">
            <p className="eo-note">
              Written before the weekend so the review is not reconstructed from
              memory afterward.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="eo-panel-link" href={`${home}/review`}>
                Open the impact review
              </Link>
            </p>
          </Panel>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ client team */

/**
 * Shine leadership.
 *
 * Four questions again, but theirs: what are we being asked to decide, what
 * are we thinking about, what is settled, and where is the money. No task
 * board, no vendor list, no run of show, no internal reasoning. Those are the
 * planners doing their job, and putting them here would be teaching the client
 * to plan the event themselves.
 */
function ClientHome({ client, event, edition, base }: LensProps) {
  const rollup = budgetRollup(edition.id);
  const openDecisions = decisionsFor(edition.id).filter(
    (decision) => decision.status === "open",
  );
  const meeting = meetingsFor(edition.id)[0];
  const schedule = scheduleCounts(edition.id);

  const sparks = sparksFor(edition.id);
  const underDiscussion = sparks.filter((spark) => spark.status === "discussing");
  const recentlyApproved = sparks
    .filter((spark) => spark.status === "approved")
    .sort((a, b) => (b.decidedOn ?? "").localeCompare(a.decidedOn ?? ""))
    .slice(0, 4);

  const firstDay = edition.days[0];

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <Hero client={client} edition={edition} line={event.summary} facts="full" />

        <dl className="eo-stats">
          <Stat
            label="Awaiting your call"
            value={String(openDecisions.length)}
            note={
              openDecisions.length === 0
                ? "Nothing open this week"
                : `Earliest needed ${shortDate(
                    openDecisions.map((decision) => decision.needsBy).sort()[0],
                  )}`
            }
          />
          <Stat
            label="Confirmed"
            value={`${schedule.confirmed} of ${schedule.total}`}
            note={`${schedule.draft} still being worked out`}
          />
          <Stat
            label="Ideas in play"
            value={String(underDiscussion.length)}
            note="On this week's agenda"
          />
          <Stat
            label="Budget"
            value={money(rollup.planned)}
            note={`${percent(rollup.committed, rollup.planned)} percent committed`}
          />
        </dl>

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            <Panel
              title="What we are asking you to decide"
              flush
              action={<Link href={base("meeting")}>This week</Link>}
            >
              <ul className="eo-rows">
                {openDecisions.map((decision) => (
                  <li key={decision.id}>
                    <div className="eo-row-lead">
                      <NodeState kind="open" label="Needs a decision" />
                    </div>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{decision.question}</div>
                      <p className="eo-row-meta">
                        Needed by {shortDate(decision.needsBy)}.
                      </p>
                    </div>
                  </li>
                ))}
                {openDecisions.length === 0 ? (
                  <li>
                    <p className="eo-empty">
                      Nothing waiting on you. We will bring the next set to the
                      weekly meeting.
                    </p>
                  </li>
                ) : null}
              </ul>
            </Panel>

            <Panel
              title="Ideas we are working through"
              flush
              action={<Link href={base("sparks")}>Your sparks</Link>}
            >
              <ul className="eo-rows">
                {underDiscussion.map((spark) => (
                  <li key={spark.id}>
                    <div className="eo-row-lead">
                      <NodeState kind="latent" label="Under discussion" />
                    </div>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{spark.title}</div>
                      <p className="eo-row-meta">
                        {spark.category}. Raised by {spark.raisedBy}.
                      </p>
                    </div>
                  </li>
                ))}
                {underDiscussion.length === 0 ? (
                  <li>
                    <p className="eo-empty">
                      Nothing under discussion right now. Add a spark any time.
                    </p>
                  </li>
                ) : null}
              </ul>
              <p className="eo-note eo-rows-foot">
                Ideas stay here until they are approved. Nothing reaches the
                schedule before Brooke confirms it.
              </p>
            </Panel>
          </div>

          <div className="eo-grid">
            <Panel
              title="Recently settled"
              flush
              action={<Link href={base("schedule")}>Confirmed schedule</Link>}
            >
              <ul className="eo-rows">
                {recentlyApproved.map((spark) => (
                  <li key={spark.id}>
                    <div className="eo-row-lead">
                      <NodeState
                        kind={spark.builds?.length ? "built" : "settled"}
                        label="Approved"
                      />
                    </div>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{spark.title}</div>
                      <p className="eo-row-meta">
                        {spark.builds?.length
                          ? `Approved and built into ${spark.builds.length} parts of the plan.`
                          : "Approved."}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Where the budget stands">
              <p className="eo-row-meta" style={{ marginTop: 0 }}>
                {money(rollup.committed)} committed of {money(rollup.planned)}{" "}
                planned.
              </p>
              <div style={{ marginTop: 12 }}>
                <Meter
                  actual={rollup.actual}
                  committed={rollup.committed}
                  planned={rollup.planned}
                />
              </div>
              <p className="eo-note" style={{ marginTop: 10 }}>
                Summary by category is on the budget page. Line by line detail
                and vendor terms stay with the planners.
              </p>
            </Panel>

            {meeting ? (
              <Panel
                title="Next time we meet"
                action={<Link href={base("meeting")}>Agenda</Link>}
              >
                <div className="eo-row-title">{meeting.title}</div>
                <p className="eo-note" style={{ marginTop: 10 }}>
                  {meeting.sparkIds.length} ideas and {meeting.decisionIds.length}{" "}
                  decisions to walk through together.
                </p>
              </Panel>
            ) : null}
          </div>
        </div>

        <p className="eo-section-title">What is confirmed</p>
        <div className="eo-panel">
          <div className="eo-panel-body eo-panel-body-flush">
            <ConfirmedDay
              edition={edition}
              dayKey={firstDay.key}
              heading={dayLabel(firstDay.date)}
              note={firstDay.note}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- stakeholder */

/**
 * A guest or a speaker.
 *
 * Confirmed only. Nothing proposed, nothing under discussion, no money, no
 * owners. Someone arriving on Thursday needs to know when to arrive, where to
 * go, and who to ask, and every other thing on this platform is noise to them.
 */
function StakeholderHome({ client, event, edition }: LensProps) {
  const coordinator = personById(edition.coordinatorId);
  const arrival = edition.days[0];
  const departure = edition.days[edition.days.length - 1];

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <Hero client={client} edition={edition} line={event.summary} facts="guest" />

        <div className="eo-grid eo-grid-2">
          <Panel title="Getting there">
            <p className="eo-row-meta" style={{ marginTop: 0 }}>
              {edition.venue}, {edition.location}.
            </p>
            <p className="eo-note" style={{ marginTop: 10 }}>
              {arrival.label} is {arrival.note.toLowerCase()} {departure.label} is{" "}
              {departure.note.toLowerCase()}
            </p>
          </Panel>
          <Panel title="Who to ask">
            <p className="eo-row-meta" style={{ marginTop: 0 }}>
              {coordinator.name}, {coordinator.role.toLowerCase()}.
            </p>
            <p className="eo-note" style={{ marginTop: 10 }}>
              Travel details and the weekend field guide come by email before
              the weekend.
            </p>
          </Panel>
        </div>

        <p className="eo-section-title">Your weekend</p>
        <div className="eo-grid">
          {edition.days.map((day) => (
            <div className="eo-panel" key={day.key}>
              <div className="eo-panel-body eo-panel-body-flush">
                <ConfirmedDay
                  edition={edition}
                  dayKey={day.key}
                  heading={dayLabel(day.date)}
                  note={day.note}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="eo-note eo-guest-foot">
          Only confirmed items appear here. Anything still being worked out
          reaches you once it is settled.
        </p>
      </div>
    </main>
  );
}
