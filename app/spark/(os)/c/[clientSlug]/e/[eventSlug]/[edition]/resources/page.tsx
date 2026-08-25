import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Resources" };

/**
 * What the weekend actually requires: the people being hired and the things
 * being gathered, each with where it stands. A resource that exists because
 * of a spark says so.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type ResourceRow = {
  id: string;
  kind: string;
  name: string;
  detail: string | null;
  quantity: string | null;
  owner_name: string | null;
  status: string;
  estimated_cents: number;
  committed_cents: number;
  actual_cents: number;
  spark: { title: string } | { title: string }[] | null;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const STATUS: Record<string, { label: string; tone: string }> = {
  confirmed: { label: "Confirmed", tone: "ev-pill-good" },
  holding: { label: "Holding", tone: "ev-pill-warm" },
  needed: { label: "Needed", tone: "ev-pill-deep" },
};

const sparkTitle = (row: ResourceRow) =>
  (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title;

export default async function ResourcesPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { data } = await context.supabase
    .from("resources")
    .select(
      "id, kind, name, detail, quantity, owner_name, status, estimated_cents, committed_cents, actual_cents, spark:sparks(title)",
    )
    .eq("engagement_id", context.engagement.id)
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  const resources = (data ?? []) as ResourceRow[];
  const groups = [
    { key: "person", title: "People", note: "Who is being asked" },
    { key: "vendor", title: "Vendors", note: "The people being hired" },
    { key: "equipment", title: "Equipment", note: "What has to be on site" },
    { key: "supply", title: "Supplies", note: "The things being gathered" },
    { key: "deliverable", title: "Deliverables", note: "What has to be made" },
  ]
    .map((group) => ({
      ...group,
      rows: resources.filter((row) => row.kind === group.key),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <>
      <h2 className="ev-page-title">Resources</h2>
      <p className="ev-lede">
        Who and what the weekend depends on, and where each one stands.
      </p>

      {groups.map((group) => (
        <section key={group.key} className="ev-section" aria-label={group.title}>
          <div className="ev-section-head">
            <h3 className="ev-section-title">{group.title}</h3>
            <span className="ev-section-note">{group.note}</span>
          </div>
          <ul className="ev-rows">
            {group.rows.map((row) => {
              const status = STATUS[row.status];
              return (
                <li key={row.id}>
                  <p className="ev-row-kicker">
                    {row.owner_name ? <span>{row.owner_name}</span> : null}
                    {row.quantity ? <span>{row.quantity}</span> : null}
                    {row.estimated_cents > 0 ? (
                      <span>{money(row.estimated_cents)} est.</span>
                    ) : null}
                    {row.actual_cents > 0 ? (
                      <span>{money(row.actual_cents)} spent</span>
                    ) : null}
                  </p>
                  <p className="ev-row-title">
                    {row.name}
                    {status ? (
                      <span className={`ev-pill ${status.tone}`}>
                        {status.label}
                      </span>
                    ) : null}
                  </p>
                  {row.detail ? (
                    <p className="ev-row-detail">{row.detail}</p>
                  ) : null}
                  {sparkTitle(row) ? (
                    <p className="ev-row-became">
                      From the spark: {sparkTitle(row)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
