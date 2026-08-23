import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { LensStrip } from "../../_components/lens-strip";
import { PlannerOnly } from "../../_components/planner-only";
import { SparkBar } from "../../_components/spark-bar";
import { Pill } from "../../_components/ui";
import { money, shortDate } from "../../_lib/format";
import { editionPath, plannerPath } from "../../_lib/paths";
import {
  budgetRollup,
  clientBySlug,
  editionsForEvent,
  eventsForClient,
  sparkCounts,
} from "../../_lib/store";
import { readViewer } from "../../_lib/viewer-server";

type PageProps = { params: Promise<{ clientSlug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { clientSlug } = await params;
  const client = clientBySlug(clientSlug);
  return { title: client ? client.name : "Client" };
}

export default async function ClientHomePage({ params }: PageProps) {
  const { clientSlug } = await params;
  const client = clientBySlug(clientSlug);
  if (!client) notFound();

  const events = eventsForClient(client.id);
  const viewer = await readViewer();

  if (viewer !== "planner") {
    const first = events[0];
    const firstEdition = first ? editionsForEvent(first.id)[0] : undefined;
    return (
      <>
        <SparkBar client={client} viewer={viewer} />
        <LensStrip viewer={viewer} />
        <PlannerOnly
          role={viewer}
          backHref={
            first && firstEdition
              ? editionPath(client.slug, first.slug, firstEdition.slug)
              : undefined
          }
          backLabel="Go to your event"
        />
      </>
    );
  }

  return (
    <>
      <SparkBar client={client} viewer={viewer} />
      <LensStrip viewer={viewer} />
      <main
      className="eo-page"
      style={
        {
          "--eo-accent": client.theme.accent,
          "--eo-accent-soft": client.theme.accentSoft,
          "--eo-on-accent": client.theme.onAccent,
        } as CSSProperties
      }
    >
      <div className="eo-shell">
        <Link className="eo-back" href={plannerPath()}>
          Back to planner
        </Link>

        <div className="eo-client-hero">
          <p className="eo-eyebrow">Client</p>
          <h1>{client.name}</h1>
          <p>{client.tagline}</p>
        </div>

        {events.map((event) => {
          const editions = editionsForEvent(event.id);
          return (
            <div key={event.id}>
              <p className="eo-section-title">
                {event.name}, {event.cadence.toLowerCase()}
              </p>
              <div className="eo-planner-grid">
                {editions.map((edition) => {
                  const rollup = budgetRollup(edition.id);
                  const sparks = sparkCounts(edition.id);
                  return (
                    <Link
                      key={edition.id}
                      className="eo-edition-card"
                      href={editionPath(client.slug, event.slug, edition.slug)}
                    >
                      <div className="eo-edition-card-top">
                        <span className="eo-client-name">{edition.slug}</span>
                        <Pill
                          tone={
                            edition.status === "complete"
                              ? "good"
                              : edition.status === "confirmed"
                                ? "accent"
                                : "warn"
                          }
                        >
                          {edition.status}
                        </Pill>
                      </div>
                      <h2>{edition.label}</h2>
                      <p className="eo-row-meta">
                        {shortDate(edition.startDate)} to{" "}
                        {shortDate(edition.endDate)}. {edition.venue}.
                      </p>
                      <div className="eo-edition-facts">
                        <span>{money(rollup.planned)} planned</span>
                        <span>{sparks.total} sparks</span>
                        <span>{edition.guestsExpected} guests</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </main>
    </>
  );
}
