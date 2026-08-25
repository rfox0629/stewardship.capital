import { notFound } from "next/navigation";

import { DAY_NAMES, DAY_ORDER, dayDateLabel, parseTimeLabel, todayKey } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { ScheduleView, type DayLane, type Moment } from "./schedule-view";

export const metadata = { title: "Schedule" };

/**
 * The weekend, hour by hour.
 *
 * One query for every role; row level security is the editor. A guest's
 * session only ever receives confirmed items, so drafts, notes, provenance,
 * and the team's Wednesday never leave the database for them. The working
 * view is the same page with more rows and more hands.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type Row = {
  id: string;
  day_key: string;
  starts_label: string;
  ends_label: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
  position: number;
  spark: { title: string } | { title: string }[] | null;
};

export default async function SchedulePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  const role = context.staff ? "planner" : context.role;

  const { data } = await context.supabase
    .from("schedule_items")
    .select(
      "id, day_key, starts_label, ends_label, title, track, location, status, note, position, spark:sparks(title)",
    )
    .eq("engagement_id", context.engagement.id);

  const moments: Moment[] = ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    day: row.day_key,
    starts: row.starts_label,
    ends: row.ends_label,
    title: row.title,
    track: row.track,
    location: row.location,
    status: row.status,
    note: row.note,
    sparkTitle: (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title ?? null,
    minutes: parseTimeLabel(row.starts_label),
  }));

  const days: DayLane[] = DAY_ORDER.map((key) => ({
    key,
    name: DAY_NAMES[key],
    date: dayDateLabel(context.engagement.startsOn, key),
    moments: moments
      .filter((moment) => moment.day === key)
      .sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999)),
  })).filter((day) => day.moments.length > 0 || (role === "planner" && key_in_weekend(day.key)));

  return (
    <>
      <h2 className="ev-page-title">The schedule</h2>
      <p className="ev-lede">
        {role !== "stakeholder"
          ? "The whole weekend at a glance. Confirmed moments, the ones still taking shape, and the room to breathe between them."
          : "Where to be and when. Everything here is confirmed."}
      </p>

      <ScheduleView
        days={days}
        role={role}
        route={{ clientSlug, eventSlug, edition }}
        today={todayKey(context.engagement.startsOn)}
        base={base}
      />
    </>
  );
}

/** Planners see the guest weekend's empty days too, so they can add to them. */
const key_in_weekend = (key: string) => key !== "wed";
