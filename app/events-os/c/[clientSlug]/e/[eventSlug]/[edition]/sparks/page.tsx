import { notFound } from "next/navigation";

import { Restricted } from "@events/_components/restricted";
import { SparksBoard } from "@events/_components/sparks-board";
import { Workflow } from "@events/_components/ui";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import { resolveEdition, sparksFor } from "@events/_lib/store";
import { canView, sparkVisibleTo } from "@events/_lib/viewer";
import { readViewer } from "@events/_lib/viewer-server";

export const metadata = { title: "Sparks" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function SparksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const viewer = await readViewer();
  const home = editionPath(client.slug, event.slug, edition.slug);

  if (!canView(viewer, "sparks")) {
    return <Restricted role={viewer} section="sparks" home={home} />;
  }

  const sparkBase = editionPath(client.slug, event.slug, edition.slug, "sparks");
  const isPlanner = viewer === "planner";

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Sparks</p>
          <h1>
            {isPlanner
              ? "Every idea, before it becomes a commitment."
              : "Every idea, on its way to becoming a weekend."}
          </h1>
          <p>
            {isPlanner
              ? "Ideas belong here first. They stay out of the confirmed plan until someone approves them, which is what keeps the schedule and the budget honest."
              : "Send us anything. Ideas stay here while we work out what they would cost, what they would move, and whether the weekend is better with them. Nothing reaches the confirmed plan until it is approved together."}
          </p>
        </div>

        <Workflow here="Spark" />

        {/* Filtered here, not in the board. The board is a client component,
            so anything passed to it ships to the browser whether it renders
            or not. */}
        <SparksBoard
          sparks={sparksFor(edition.id).filter((spark) =>
            sparkVisibleTo(viewer, spark.status),
          )}
          sparkBase={sparkBase}
          viewer={viewer}
        />
      </div>
    </main>
  );
}
