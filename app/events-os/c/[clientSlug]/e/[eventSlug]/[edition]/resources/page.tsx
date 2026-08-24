import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Pill } from "@events/_components/ui";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import { personById, resolveEdition, resourcesFor } from "@events/_lib/store";

export const metadata = { title: "Resources" };

type PageProps = { params: Promise<EditionRouteParams> };

const tone = (status: string) =>
  status === "confirmed" ? "good" : status === "holding" ? "warn" : "stop";

export default async function ResourcesPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);
  const resources = resourcesFor(edition.id);
  const vendors = resources.filter((resource) => resource.kind === "vendor");
  const supplies = resources.filter((resource) => resource.kind === "supply");

  const renderList = (items: typeof resources) => (
    <ul className="eo-rows">
      {items.map((resource) => (
        <li key={resource.id}>
          <div className="eo-row-main">
            <div className="eo-row-title">{resource.name}</div>
            <p className="eo-row-meta">
              {resource.detail} {personById(resource.ownerId).name} owns it.
              {resource.quantity ? ` ${resource.quantity}.` : ""}
              {resource.sparkId ? (
                <>
                  {" "}
                  <Link
                    className="eo-panel-link"
                    href={`${base("sparks")}/${resource.sparkId}`}
                  >
                    from a spark
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="eo-row-side">
            <Pill tone={tone(resource.status)}>{resource.status}</Pill>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Resources</p>
          <h1>Vendors and supplies, with an owner on each.</h1>
          <p>
            Anything marked needed is not secured. That is the only status that
            should make anyone nervous.
          </p>
        </div>

        <div className="eo-grid eo-grid-2">
          <Panel title="Vendors" flush>
            {renderList(vendors)}
          </Panel>
          <Panel title="Supplies" flush>
            {renderList(supplies)}
          </Panel>
        </div>
      </div>
    </main>
  );
}
