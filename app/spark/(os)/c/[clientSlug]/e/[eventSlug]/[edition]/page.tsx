import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "The weekend" };

/**
 * The weekend itself: what it is for, where it happens, and the material the
 * team keeps returning to.
 *
 * This is the one surface that wears the event rather than the product. It is
 * reference, so it reads rather than works, and everything on it comes from
 * the engagement's own record under the reader's session.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function WeekendPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { engagement, supabase } = context;
  const reference = engagement.reference ?? {};

  const [ideasQ, scheduleQ, actionsQ, budgetQ] = await Promise.all([
    supabase.from("sparks").select("status").eq("engagement_id", engagement.id),
    supabase.from("schedule_items").select("id", { count: "exact", head: true }).eq("engagement_id", engagement.id),
    supabase.from("tasks").select("status").eq("engagement_id", engagement.id),
    supabase.from("budget_lines").select("planned_cents").eq("engagement_id", engagement.id),
  ]);

  const ideas = ideasQ.data ?? [];
  const openActions = (actionsQ.data ?? []).filter((row) => row.status !== "done").length;
  const working = (budgetQ.data ?? []).reduce((total, row) => total + row.planned_cents, 0);

  const glance = [
    { label: "Ideas", value: String(ideas.filter((row) => row.status !== "parked" && row.status !== "declined").length), href: `${base}/plan` },
    { label: "On the schedule", value: String(scheduleQ.count ?? 0), href: `${base}/schedule` },
    { label: "Open actions", value: String(openActions), href: `${base}/actions` },
    { label: "Working budget", value: money(working), href: `${base}/budget` },
  ];

  return (
    <div className="wk">
      {engagement.summary ? <p className="wk-lede">{engagement.summary}</p> : null}

      <div className="wk-glance">
        {glance.map((item) => (
          <a key={item.label} className="wk-stat" href={item.href}>
            <b>{item.value}</b>
            <span>{item.label}</span>
          </a>
        ))}
      </div>

      {reference.vision ? (
        <section className="wk-section" aria-label="Vision">
          <header className="wk-head">
            <h3>{reference.vision.theme ?? "Vision"}</h3>
            {reference.vision.scripture ? <span>{reference.vision.scripture}</span> : null}
          </header>
          <ul className="wk-elements">
            {(reference.vision.elements ?? []).map((element) => (
              <li key={element.name}>
                <b>{element.name}</b>
                {element.scripture ? <span className="wk-ref">{element.scripture}</span> : null}
                {element.connection ? <p>{element.connection}</p> : null}
                {element.practical ? <p className="wk-practical">{element.practical}</p> : null}
              </li>
            ))}
          </ul>
          {reference.vision.needs ? <p className="wk-needs">{reference.vision.needs}</p> : null}
        </section>
      ) : null}

      {reference.venue ? (
        <section className="wk-section" aria-label="Venue">
          <header className="wk-head">
            <h3>{reference.venue.name ?? engagement.venue ?? "Venue"}</h3>
            {engagement.location ? <span>{engagement.location}</span> : null}
          </header>
          <ul className="wk-amenities">
            {(reference.venue.amenities ?? []).map((amenity) => (
              <li key={amenity.name}>
                {amenity.name}
                <em className={`wk-standing wk-standing-${amenity.standing ?? "unconfirmed"}`}>
                  {amenity.standing === "rental" ? "Rental"
                    : amenity.standing === "built in" ? "Built in"
                    : amenity.standing === "review confirmed" ? "Confirmed"
                    : "Confirm"}
                </em>
              </li>
            ))}
          </ul>
          {reference.venue.needs ? <p className="wk-needs">{reference.venue.needs}</p> : null}
        </section>
      ) : null}

      {reference.drinks ? (
        <section className="wk-section" aria-label="Drinks">
          <header className="wk-head">
            <h3>SHINE specialty drink</h3>
            <span>Nothing chosen yet</span>
          </header>
          <ul className="wk-drinks">
            {(reference.drinks.options ?? []).map((drink) => (
              <li key={drink.name}>
                <b>{drink.name}</b>
                {drink.ingredients ? <span>{drink.ingredients}</span> : null}
                {drink.feel ? <em>{drink.feel}</em> : null}
              </li>
            ))}
          </ul>
          {reference.drinks.needs ? <p className="wk-needs">{reference.drinks.needs}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
