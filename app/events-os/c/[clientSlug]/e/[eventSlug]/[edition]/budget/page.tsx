import Link from "next/link";
import { notFound } from "next/navigation";

import { Restricted } from "@events/_components/restricted";
import { Meter, Panel, Pill, Stat, Workflow } from "@events/_components/ui";
import { money, percent } from "@events/_lib/format";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import { budgetRollup, personById, resolveEdition } from "@events/_lib/store";
import { canView } from "@events/_lib/viewer";
import { readViewer } from "@events/_lib/viewer-server";

export const metadata = { title: "Budget" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function BudgetPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const viewer = await readViewer();
  const home = editionPath(client.slug, event.slug, edition.slug);

  if (!canView(viewer, "budget")) {
    return <Restricted role={viewer} section="budget" home={home} />;
  }

  const isPlanner = viewer === "planner";
  const rollup = budgetRollup(edition.id);
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Budget</p>
          <h1>
            {money(rollup.planned)} planned for {edition.guestsExpected} guests.
          </h1>
          <p>
            {isPlanner
              ? "Planned is the commitment. Committed is what a vendor is holding. Actual is money that has already left. Those three are different numbers and the plan breaks when they get treated as one."
              : "Planned is what we agreed. Committed is what a vendor is already holding. Actual is money that has left. This is the summary by category. Line by line detail, vendor terms, and the tradeoffs behind them stay with the planners."}
          </p>
        </div>

        {isPlanner ? <Workflow here="Build" /> : null}

        <dl className="eo-stats">
          <Stat label="Planned" value={money(rollup.planned)} note="The agreed ceiling" />
          <Stat
            label="Committed"
            value={money(rollup.committed)}
            note={`${percent(rollup.committed, rollup.planned)} percent of plan`}
          />
          <Stat
            label="Actual"
            value={money(rollup.actual)}
            note={`${percent(rollup.actual, rollup.planned)} percent paid`}
          />
          <Stat
            label="Uncommitted"
            value={money(rollup.uncommitted)}
            note="Still moveable"
          />
        </dl>

        <div className="eo-grid">
          {rollup.byCategory.map((category) => (
            <Panel
              key={category.category}
              title={category.category}
              flush
              action={
                <span className="eo-panel-link">
                  {money(category.committed)} of {money(category.planned)}
                </span>
              }
            >
              <div style={{ padding: "14px 18px 4px" }}>
                <Meter
                  actual={category.actual}
                  committed={category.committed}
                  planned={category.planned}
                />
              </div>

              {isPlanner ? (
                <ul className="eo-rows">
                  {category.lines.map((line) => (
                    <li key={line.id}>
                      <div className="eo-row-main">
                        <div className="eo-row-title">{line.label}</div>
                        <p className="eo-row-meta">
                          {personById(line.ownerId).name}.{" "}
                          {line.committed === 0
                            ? "Nothing committed."
                            : `${money(line.committed)} committed, ${money(line.actual)} paid.`}
                          {line.sparkId ? (
                            <>
                              {" "}
                              <Link
                                className="eo-panel-link"
                                href={`${base("sparks")}/${line.sparkId}`}
                              >
                                from a spark
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="eo-row-side">
                        {line.committed === 0 ? <Pill tone="warn">open</Pill> : null}
                        <span className="eo-row-amount">{money(line.planned)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="eo-note eo-rows-foot">
                  {category.lines.length === 1
                    ? "1 line in this category."
                    : `${category.lines.length} lines in this category.`}{" "}
                  {money(category.actual)} paid so far.
                </p>
              )}
            </Panel>
          ))}
        </div>
      </div>
    </main>
  );
}
