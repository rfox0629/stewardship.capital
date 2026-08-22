import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { EditionNav } from "@events/_components/edition-nav";
import { SparkBar } from "@events/_components/spark-bar";
import { SparkMark } from "@events/_components/spark-mark";
import type { EditionRouteParams } from "@events/_lib/paths";
import { resolveEdition } from "@events/_lib/store";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<EditionRouteParams>;
};

export default async function EditionLayout({ children, params }: LayoutProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;

  return (
    <div
      data-eo-client={client.slug}
      data-eo-event={event.slug}
      style={
        {
          /* Layer 2, the client. Organisation identity. */
          "--client-accent": client.theme.accent,
          /* Layer 3, the event. Emotional identity for this one gathering. */
          "--event-accent": edition.theme.ember,
          "--event-canopy": edition.theme.canopy,
          "--event-water": edition.theme.water,
          "--event-bark": edition.theme.bark,
          "--event-mist": edition.theme.mist,
        } as CSSProperties
      }
    >
      <SparkBar client={client} edition={edition} />
      <EditionNav
        clientSlug={client.slug}
        eventSlug={event.slug}
        editionSlug={edition.slug}
      />

      {children}

      <footer className="sp-foot">
        <div className="eo-shell">
          <span className="sp-powered">
            Powered by <SparkMark />
          </span>
        </div>
      </footer>
    </div>
  );
}
