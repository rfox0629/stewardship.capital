import Link from "next/link";
import { notFound } from "next/navigation";

import { EventScene } from "@events/_components/event-scene";
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

type PageProps = { params: Promise<EditionRouteParams> };

export async function generateMetadata({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, edition);
  return { title: resolved ? resolved.edition.label : "Event" };
}

export default async function EventHomePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);
  const home = editionPath(client.slug, event.slug, edition.slug);

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
        <section className="eo-hero">
          <div className="eo-hero-art">
            <EventScene theme={edition.theme} />
          </div>
          <div className="eo-hero-inner">
            <p className="eo-eyebrow" style={{ color: "rgba(251,248,241,0.6)" }}>
              {client.name}
            </p>
            <h1 className="eo-serif">{edition.label}</h1>
            <p>{event.summary}</p>
            <div className="eo-hero-facts">
              <span>
                {shortDate(edition.startDate)} to {shortDate(edition.endDate)}
              </span>
              <span>{edition.location}</span>
              <span>{edition.venue}</span>
              <span>{edition.guestsExpected} guests expected</span>
              <span>
                Coordinator {personById(edition.coordinatorId).name}
              </span>
              <span>Emcee {personById(edition.emceeId).name}</span>
            </div>
            <p className="eo-hero-photo-note">
              Event layer artwork is generated from this edition&apos;s theme.
              Real photography drops in here without touching the operating
              system shell.
            </p>
          </div>
        </section>

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
              <Panel title="Next planning meeting" action={<Link href={base("meeting")}>Open</Link>}>
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
