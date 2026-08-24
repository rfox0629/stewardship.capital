import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill, Workflow } from "@spark/_components/ui";
import { dayLabel } from "@spark/_lib/format";
import { editionPath } from "@spark/_lib/paths";
import type { EditionRouteParams } from "@spark/_lib/paths";
import {
  personById,
  resolveEdition,
  scheduleCounts,
  scheduleFor,
} from "@spark/_lib/store";
import type { ScheduleTrack } from "@spark/_lib/types";

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
  const items = scheduleFor(edition.id);
  const counts = scheduleCounts(edition.id);
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Confirmed schedule</p>
          <h1>{counts.confirmed} confirmed, {counts.draft} still draft.</h1>
          <p>
            Draft items are shaded. They are visible so nobody forgets them, and
            marked so nobody plans around them yet.
          </p>
        </div>

        <Workflow here="Confirm" />

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
                    {item.status === "draft" ? <Pill tone="warn">draft</Pill> : null}
                    {item.sparkId ? (
                      <Link
                        className="eo-panel-link"
                        href={`${base("sparks")}/${item.sparkId}`}
                      >
                        from a spark
                      </Link>
                    ) : null}
                  </span>
                  <p className="eo-slot-meta">
                    {item.location}. {personById(item.ownerId).name}.
                    {item.note ? ` ${item.note}` : ""}
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
