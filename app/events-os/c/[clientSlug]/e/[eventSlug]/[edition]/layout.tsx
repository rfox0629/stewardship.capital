import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { EditionNav } from "@events/_components/edition-nav";
import { clientPath, plannerPath } from "@events/_lib/paths";
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
          "--eo-accent": client.theme.accent,
          "--eo-accent-soft": client.theme.accentSoft,
          "--eo-on-accent": client.theme.onAccent,
          "--eo-canopy": edition.theme.canopy,
          "--eo-water": edition.theme.water,
          "--eo-ember": edition.theme.ember,
          "--eo-bark": edition.theme.bark,
          "--eo-mist": edition.theme.mist,
        } as CSSProperties
      }
    >
      <div className="eo-crumbbar">
        <div className="eo-crumbs">
          <Link href={plannerPath()}>Planner</Link>
          <span aria-hidden="true">/</span>
          <Link href={clientPath(client.slug)}>{client.name}</Link>
          <span aria-hidden="true">/</span>
          <span className="eo-crumb-current">{edition.label}</span>
        </div>
      </div>

      <EditionNav
        clientSlug={client.slug}
        eventSlug={event.slug}
        editionSlug={edition.slug}
      />

      {children}
    </div>
  );
}
