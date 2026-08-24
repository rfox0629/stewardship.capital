import { notFound } from "next/navigation";

import { SparksBoard } from "@spark/_components/sparks-board";
import { Workflow } from "@spark/_components/ui";
import { editionPath } from "@spark/_lib/paths";
import type { EditionRouteParams } from "@spark/_lib/paths";
import { resolveEdition, sparksFor } from "@spark/_lib/store";

export const metadata = { title: "Sparks" };

type PageProps = { params: Promise<EditionRouteParams> };

export default async function SparksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const sparkBase = editionPath(client.slug, event.slug, edition.slug, "sparks");

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Sparks</p>
          <h1>Every idea, before it becomes a commitment.</h1>
          <p>
            Ideas belong here first. They stay out of the confirmed plan until
            someone approves them, which is what keeps the schedule and the
            budget honest.
          </p>
        </div>

        <Workflow here="Spark" />

        <SparksBoard sparks={sparksFor(edition.id)} sparkBase={sparkBase} />
      </div>
    </main>
  );
}
