import Link from "next/link";

import { LensStrip } from "./_components/lens-strip";
import { PlannerOnly } from "./_components/planner-only";
import { SparkBar } from "./_components/spark-bar";
import { Pill } from "./_components/ui";
import { shortDate } from "./_lib/format";
import { clientPath, editionPath } from "./_lib/paths";
import {
  allClients,
  budgetRollup,
  personById,
  plannerRows,
  reviewFor,
  sparkCounts,
  taskCounts,
} from "./_lib/store";
import { money } from "./_lib/format";
import { readViewer } from "./_lib/viewer-server";
import type { CSSProperties } from "react";

export const metadata = { title: { absolute: "Planner | Spark" } };

const statusTone = (status: string) =>
  status === "complete" ? "good" : status === "confirmed" ? "accent" : "warn";

export default async function PlannerHomePage() {
  const viewer = await readViewer();
  const rows = plannerRows();
  const clients = allClients();

  if (viewer !== "planner") {
    return (
      <>
        <SparkBar viewer={viewer} />
        <LensStrip viewer={viewer} />
        <PlannerOnly role={viewer} />
      </>
    );
  }

  return (
    <>
      <SparkBar viewer={viewer} />
      <LensStrip viewer={viewer} />
      <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Planner</p>
          <h1>Every event on the platform.</h1>
          <p>
            One row per edition. Editions are how an annual event compounds, so
            2026 can inherit what 2025 learned without starting over.
          </p>
        </div>

        <p className="eo-section-title">Editions</p>
        <div className="eo-planner-grid">
          {rows.map(({ client, event, edition }) => {
            const sparks = sparkCounts(edition.id);
            const tasks = taskCounts(edition.id);
            const rollup = budgetRollup(edition.id);
            const review = reviewFor(edition.id);
            const isComplete = edition.status === "complete";

            return (
              <Link
                key={edition.id}
                className="eo-edition-card"
                style={
                  {
                    "--eo-accent": client.theme.accent,
                    "--eo-accent-soft": client.theme.accentSoft,
                  } as CSSProperties
                }
                href={editionPath(client.slug, event.slug, edition.slug)}
              >
                <div className="eo-edition-card-top">
                  <span className="eo-client-name">{client.name}</span>
                  <Pill tone={statusTone(edition.status)}>{edition.status}</Pill>
                </div>
                <h2>{edition.label}</h2>
                <p className="eo-row-meta">
                  {shortDate(edition.startDate)} to {shortDate(edition.endDate)}.{" "}
                  {edition.location}.
                </p>
                <div className="eo-edition-facts">
                  {isComplete && review ? (
                    <>
                      <span>{money(review.spendActual ?? rollup.actual)} spent</span>
                      <span>{money(edition.budgetTotal)} planned</span>
                      <span>{review.attended ?? edition.guestsExpected} attended</span>
                      <span>{review.carryForward.length} carried forward</span>
                    </>
                  ) : (
                    <>
                      <span>{money(rollup.planned)} planned</span>
                      <span>{sparks.total} sparks</span>
                      <span>{tasks.open} open tasks</span>
                      <span>{edition.guestsExpected} guests</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <p className="eo-section-title">Clients</p>
        <div className="eo-planner-grid">
          {clients.map((client) => (
            <Link
              key={client.id}
              className="eo-edition-card"
              style={
                {
                  "--eo-accent": client.theme.accent,
                  "--eo-accent-soft": client.theme.accentSoft,
                } as CSSProperties
              }
              href={clientPath(client.slug)}
            >
              <div className="eo-edition-card-top">
                <span className="eo-client-name">Client</span>
              </div>
              <h2>{client.name}</h2>
              <p className="eo-row-meta">{client.tagline}</p>
            </Link>
          ))}
        </div>

        <p className="eo-section-title">Who is on the platform</p>
        <div className="eo-panel">
          <ul className="eo-rows">
            {["p-brooke", "p-ryan", "p-megan", "p-sam", "p-tori", "p-dave", "p-lena"].map(
              (id) => {
                const person = personById(id);
                return (
                  <li key={id}>
                    <div className="eo-row-main">
                      <div className="eo-row-title">{person.name}</div>
                      <p className="eo-row-meta">
                        {person.role}
                        {person.organization ? `, ${person.organization}` : ""}
                      </p>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        </div>
      </div>
      </main>
    </>
  );
}
