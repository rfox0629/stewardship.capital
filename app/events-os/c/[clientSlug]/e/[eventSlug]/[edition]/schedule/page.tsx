import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill, Workflow } from "@events/_components/ui";
import { dayLabel } from "@events/_lib/format";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import {
  personById,
  resolveEdition,
  scheduleCounts,
  scheduleFor,
} from "@events/_lib/store";
import type { ScheduleTrack } from "@events/_lib/types";
import { readViewer } from "@events/_lib/viewer-server";

export const metadata = { title: "Confirmed schedule" };

const tracks: ScheduleTrack[] = [
  "Program",
  "Meals",
  "Experience",
  "Logistics",
  "Hospitality",
];

type PageProps = { params: Promise<EditionRouteParams> };

export default async function SchedulePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const viewer = await readViewer();
  const isPlanner = viewer === "planner";

  const counts = scheduleCounts(edition.id);
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  /* A guest sees confirmed only. A client sees drafts, because they are part
     of deciding them, but they are labelled proposed rather than draft: the
     word says who is holding the pen. */
  const items =
    viewer === "stakeholder"
      ? scheduleFor(edition.id).filter((item) => item.status === "confirmed")
      : scheduleFor(edition.id);

  const heading =
    viewer === "stakeholder"
      ? `${counts.confirmed} confirmed items across four days.`
      : isPlanner
        ? `${counts.confirmed} confirmed, ${counts.draft} still draft.`
        : `${counts.confirmed} confirmed, ${counts.draft} still proposed.`;

  const lede =
    viewer === "stakeholder"
      ? "Only confirmed items appear here. Anything still being worked out reaches you once it is settled."
      : isPlanner
        ? "Draft items are shaded. They are visible so nobody forgets them, and marked so nobody plans around them yet."
        : "Proposed items are shaded. They are here so you can see what we are considering and what it would move. They stay proposed until Brooke confirms them.";

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Confirmed schedule</p>
          <h1>{heading}</h1>
          <p>{lede}</p>
        </div>

        {viewer === "stakeholder" ? null : <Workflow here="Confirm" />}

        <div className="eo-legend">
          {tracks.map((track) => (
            <span key={track}>
              <span className={`eo-track-dot eo-track-${track}`} aria-hidden="true" />
              {track}
            </span>
          ))}
        </div>

        {edition.days.map((day) => {
          const dayItems = items.filter((item) => item.dayKey === day.key);
          return (
            <section className="eo-panel eo-day" key={day.key}>
              <div className="eo-day-head">
                <h2>{dayLabel(day.date)}</h2>
                <p>{day.note}</p>
              </div>
              {dayItems.map((item) => (
                <div className="eo-slot" key={item.id} data-status={item.status}>
                  <span className="eo-slot-time">
                    {item.start} to {item.end}
                  </span>
                  <span className="eo-slot-title">
                    <span
                      className={`eo-track-dot eo-track-${item.track}`}
                      aria-hidden="true"
                    />
                    {item.title}
                    {item.status === "draft" ? (
                      <Pill tone="warn">{isPlanner ? "draft" : "proposed"}</Pill>
                    ) : null}
                    {item.sparkId && viewer !== "stakeholder" ? (
                      <Link
                        className="eo-panel-link"
                        href={`${base("sparks")}/${item.sparkId}`}
                      >
                        from a spark
                      </Link>
                    ) : null}
                  </span>
                  <p className="eo-slot-meta">
                    {viewer === "stakeholder"
                      ? item.location
                      : `${item.location}. ${personById(item.ownerId).name}.${
                          item.note ? ` ${item.note}` : ""
                        }`}
                  </p>
                </div>
              ))}
              {dayItems.length === 0 ? (
                <p className="eo-empty">Nothing scheduled yet.</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </main>
  );
}
