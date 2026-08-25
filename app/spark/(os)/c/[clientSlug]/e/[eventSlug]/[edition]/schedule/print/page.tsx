import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DAY_NAMES, DAY_ORDER, dayDateLabel, parseTimeLabel } from "@lib/spark/days";
import { dateRangeLabel, resolveEngagement } from "@lib/spark/engagement";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print the schedule" };

/**
 * The schedule as a printed page: what goes in cabins, on tables, and into
 * welcome folders.
 *
 * Deliberately designed rather than printed off the screen. Regardless of who
 * is looking, it renders only what a guest may hold in their hands: confirmed
 * moments, times, places. No drafts, no notes, no provenance, no controls,
 * and none of the team's Wednesday. What the preview shows is what prints,
 * because it is the same markup with the chrome removed by print CSS.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type Row = {
  day_key: string;
  starts_label: string;
  ends_label: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
};

export default async function SchedulePrintPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;

  const { data } = await context.supabase
    .from("schedule_items")
    .select("day_key, starts_label, ends_label, title, track, location, status")
    .eq("engagement_id", context.engagement.id)
    .eq("status", "confirmed");

  const rows = (data ?? []) as Row[];
  const days = DAY_ORDER.filter((key) => key !== "wed")
    .map((key) => ({
      key,
      name: DAY_NAMES[key],
      date: dayDateLabel(context.engagement.startsOn, key),
      moments: rows
        .filter((row) => row.day_key === key)
        .sort(
          (a, b) =>
            (parseTimeLabel(a.starts_label) ?? 9999) - (parseTimeLabel(b.starts_label) ?? 9999),
        ),
    }))
    .filter((day) => day.moments.length > 0);

  const { engagement, theme } = context;

  return (
    <div className="ev-print-page">
      <div className="ev-print-controls">
        <Link href={`${base}/schedule`}>Back to the schedule</Link>
        <PrintButton />
      </div>

      <div className="ev-print-sheet">
        <header className="ev-print-head">
          {theme.images.organizationLogo ? (
            <Image
              src={theme.images.organizationLogo}
              alt={engagement.organizationName}
              width={110}
              height={57}
            />
          ) : null}
          <h1>{engagement.name}</h1>
          {theme.copy.tagline ? <p className="ev-print-campaign">{theme.copy.tagline}</p> : null}
          <p className="ev-print-meta">
            {dateRangeLabel(engagement.startsOn, engagement.endsOn)}
            {engagement.venue ? ` · ${engagement.venue}` : ""}
            {engagement.location ? ` · ${engagement.location}` : ""}
          </p>
        </header>

        <div className="ev-print-days">
          {days.map((day) => (
            <section key={day.key} className="ev-print-day">
              <h2>
                {day.name} <span>{day.date}</span>
              </h2>
              <ul>
                {day.moments.map((moment, index) => (
                  <li key={index}>
                    <span className="ev-print-time">
                      {moment.starts_label}
                      {moment.ends_label ? ` to ${moment.ends_label}` : ""}
                    </span>
                    <span className="ev-print-what">
                      {moment.title}
                      {moment.location ? (
                        <span className="ev-print-where"> · {moment.location}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="ev-print-foot">
          {engagement.organizationName} · {engagement.name}
        </footer>
      </div>
    </div>
  );
}
