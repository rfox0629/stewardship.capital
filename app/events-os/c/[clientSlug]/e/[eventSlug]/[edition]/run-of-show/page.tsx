import { notFound } from "next/navigation";

import { Panel, Workflow } from "@events/_components/ui";
import { dayLabel } from "@events/_lib/format";
import type { EditionRouteParams } from "@events/_lib/paths";
import {
  cuesFor,
  personById,
  resolveEdition,
  scheduleItemById,
} from "@events/_lib/store";

export const metadata = { title: "Run of show" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function RunOfShowPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { edition } = resolved;
  const cues = cuesFor(edition.id);

  const byItem = new Map<string, typeof cues>();
  cues.forEach((cue) => {
    const bucket = byItem.get(cue.scheduleItemId) ?? [];
    bucket.push(cue);
    byItem.set(cue.scheduleItemId, bucket);
  });

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Run of show</p>
          <h1>Minute by minute, only where it matters.</h1>
          <p>
            Cues exist for the moments that fall apart without them. Everything
            else stays on the schedule, where it belongs.
          </p>
        </div>

        <Workflow here="Confirm" />

        <div className="eo-grid">
          {Array.from(byItem.entries()).map(([itemId, itemCues]) => {
            const item = scheduleItemById(itemId);
            if (!item) return null;
            const day = edition.days.find((candidate) => candidate.key === item.dayKey);
            return (
              <Panel
                key={itemId}
                title={item.title}
                flush
                action={
                  <span className="eo-panel-link">
                    {day ? dayLabel(day.date) : ""}, {item.start}
                  </span>
                }
              >
                <ul className="eo-rows">
                  {itemCues.map((cue) => (
                    <li key={cue.id}>
                      <span className="eo-slot-time" style={{ width: 76, flex: "none" }}>
                        {cue.at}
                      </span>
                      <div className="eo-row-main">
                        <div className="eo-row-title">{cue.cue}</div>
                        <p className="eo-row-meta">{personById(cue.whoId).name}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
          {byItem.size === 0 ? (
            <Panel title="No cues yet">
              <p>
                Add cues from any schedule item once the shape of the day is
                settled.
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </main>
  );
}
