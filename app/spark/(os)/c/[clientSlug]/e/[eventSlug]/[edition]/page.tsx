import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dateRangeLabel, resolveEngagement } from "@lib/spark/engagement";

/**
 * The weekend, at a glance.
 *
 * A working surface: planners and clients land here. Guests are routed to the
 * schedule by the guard before this renders, and the redirect below is only
 * the belt to that suspender.
 *
 * Every number on this page is a live query under the reader's own session.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function EngagementHomePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { engagement, theme, supabase } = context;

  const [{ data: sparkRows }, { count: confirmedCount }] = await Promise.all([
    supabase
      .from("sparks")
      .select("status")
      .eq("engagement_id", engagement.id),
    supabase
      .from("schedule_items")
      .select("*", { count: "exact", head: true })
      .eq("engagement_id", engagement.id)
      .eq("status", "confirmed"),
  ]);

  const byStatus = (status: string) =>
    (sparkRows ?? []).filter((row: { status: string }) => row.status === status).length;

  const captured = byStatus("captured");
  const discussing = byStatus("discussing");
  const approved = byStatus("approved");

  const plural = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? "" : "s"}`;

  const dates = dateRangeLabel(engagement.startsOn, engagement.endsOn);

  return (
    <>
      <h2 className="ev-page-title">
        {theme.copy.welcome ? "Welcome" : engagement.name}
      </h2>
      {theme.copy.welcome ? <p className="ev-lede">{theme.copy.welcome}</p> : null}

      <section className="ev-section" aria-label="The weekend at a glance">
        <div className="ev-section-head">
          <h3 className="ev-section-title">At a glance</h3>
        </div>
        <dl className="ev-glance">
          {dates ? (
            <div>
              <dt>Dates</dt>
              <dd>{dates}</dd>
            </div>
          ) : null}
          {engagement.venue ? (
            <div>
              <dt>Where</dt>
              <dd>{engagement.venue}</dd>
            </div>
          ) : null}
          <div>
            <dt>Guests</dt>
            <dd>{engagement.guestsExpected} expected</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{money(engagement.budgetTotalCents)} planned</dd>
          </div>
        </dl>
      </section>

      {theme.images.gallery.length > 0 ? (
        <section className="ev-section" aria-label="The place">
          <div className="ev-section-head">
            <h3 className="ev-section-title">The place</h3>
            <span className="ev-section-note">
              {engagement.venue ?? engagement.location ?? ""}
            </span>
          </div>
          <div className="ev-gallery">
            {theme.images.gallery.map((src) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={1200}
                height={800}
                sizes="(max-width: 720px) 100vw, 33vw"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="ev-section" aria-label="The path of an idea">
        <div className="ev-section-head">
          <h3 className="ev-section-title">The path of an idea</h3>
          <span className="ev-section-note">
            A spark is an idea, not an approval
          </span>
        </div>
        <div className="ev-flow">
          <Link href={`${base}/sparks`}>
            <span className="ev-flow-verb">Capture freely.</span>
            <span className="ev-flow-count">{plural(captured, "spark")} waiting</span>
          </Link>
          <Link href={`${base}/sparks`}>
            <span className="ev-flow-verb">Discern carefully.</span>
            <span className="ev-flow-count">{plural(discussing, "idea")} in discussion</span>
          </Link>
          <Link href={`${base}/schedule`}>
            <span className="ev-flow-verb">Move intentionally.</span>
            <span className="ev-flow-count">
              {plural(approved, "approved spark")}, {confirmedCount ?? 0} confirmed moments
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
