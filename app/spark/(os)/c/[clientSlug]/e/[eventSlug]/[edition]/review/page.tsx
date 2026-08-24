import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Pill, Stat, Workflow } from "@spark/_components/ui";
import { money } from "@spark/_lib/format";
import { editionPath } from "@spark/_lib/paths";
import type { EditionRouteParams } from "@spark/_lib/paths";
import {
  editionById,
  editionsForEvent,
  resolveEdition,
  reviewFor,
} from "@spark/_lib/store";

export const metadata = { title: "Impact review" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function ReviewPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const review = reviewFor(edition.id);
  const previous = edition.reusedFromEditionId
    ? editionById(edition.reusedFromEditionId)
    : undefined;
  const previousReview = previous ? reviewFor(previous.id) : undefined;
  const siblings = editionsForEvent(event.id).filter(
    (candidate) => candidate.id !== edition.id,
  );

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Impact review</p>
          <h1>{review ? review.headline : "No review yet."}</h1>
          <p>
            An edition is only worth running annually if the next one starts
            further ahead than the last one did.
          </p>
          {review ? (
            <div style={{ marginTop: 12 }}>
              <Pill tone={review.state === "complete" ? "good" : "warn"}>
                {review.state}
              </Pill>
            </div>
          ) : null}
        </div>

        <Workflow here="Reflect" />

        {review && review.state === "complete" ? (
          <dl className="eo-stats">
            <Stat label="Attended" value={String(review.attended ?? 0)} />
            <Stat label="Actual spend" value={money(review.spendActual ?? 0)} />
            <Stat label="Planned" value={money(edition.budgetTotal)} />
            <Stat
              label="Carried forward"
              value={String(review.carryForward.length)}
              note="into the next edition"
            />
          </dl>
        ) : null}

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            {review ? (
              <Panel title="The review" flush>
                {review.sections.map((section) => (
                  <div className="eo-review-section" key={section.heading}>
                    <h3>{section.heading}</h3>
                    <ul>
                      {section.entries.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Panel>
            ) : (
              <Panel title="The review">
                <p>Nothing recorded for this edition yet.</p>
              </Panel>
            )}
          </div>

          <div className="eo-grid">
            {previousReview && previousReview.carryForward.length > 0 ? (
              <Panel title={`Carried in from ${previous?.label}`}>
                <div className="eo-carry">
                  {previousReview.carryForward.map((item) => (
                    <div className="eo-carry-item" key={item}>
                      <span aria-hidden="true">&#10003;</span>
                      {item}
                    </div>
                  ))}
                </div>
                <p className="eo-note" style={{ marginTop: 14 }}>
                  This is what makes an edition different from a new event. The
                  next one inherits the answers.
                </p>
              </Panel>
            ) : null}

            {review && review.carryForward.length > 0 ? (
              <Panel title="Carry into the next edition">
                <div className="eo-carry">
                  {review.carryForward.map((item) => (
                    <div className="eo-carry-item" key={item}>
                      <span aria-hidden="true">&#10003;</span>
                      {item}
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {siblings.length > 0 ? (
              <Panel title="Other editions" flush>
                <ul className="eo-rows">
                  {siblings.map((sibling) => (
                    <li key={sibling.id}>
                      <div className="eo-row-main">
                        <div className="eo-row-title">
                          <Link
                            href={editionPath(client.slug, event.slug, sibling.slug)}
                          >
                            {sibling.label}
                          </Link>
                        </div>
                        <p className="eo-row-meta">
                          {sibling.status}. {money(sibling.budgetTotal)} planned.
                        </p>
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
