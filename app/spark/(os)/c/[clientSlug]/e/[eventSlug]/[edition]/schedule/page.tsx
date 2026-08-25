import { notFound } from "next/navigation";

import { DAY_NAMES, DAY_ORDER, dayDateLabel, parseTimeLabel, todayKey } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { ScheduleView, type DayLane, type Moment } from "./schedule-view";

export const metadata = { title: "Schedule" };

/**
 * One query for every role; row level security is the editor. A guest's
 * session only receives confirmed items, so drafts, notes, provenance, and
 * the team's Wednesday never leave the database for them.
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
  spark: { title: string } | { title: string }[] | null;
};

export default async function SchedulePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  const role = context.staff ? "planner" : context.role;

  const tentativeQ =
    role === "planner"
      ? await context.supabase
          .from("sparks")
          .select("id, title, status, tentative_day, tentative_daypart")
          .eq("engagement_id", context.engagement.id)
          .not("tentative_day", "is", null)
          .in("status", ["captured", "discussing", "approved"])
      : { data: [] };

  const { data } = await context.supabase
    .from("schedule_items")
    .select(
      "id, day_key, starts_label, ends_label, title, track, location, status, note, spark:sparks(title)",
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
    endMinutes: parseTimeLabel(row.ends_label),
  }));

  const present = new Set(moments.map((moment) => moment.day));
  const days: DayLane[] = DAY_ORDER.filter(
    (key) => key !== "wed" || present.has("wed"),
  ).map((key) => ({
    key,
    name: DAY_NAMES[key],
    date: dayDateLabel(context.engagement.startsOn, key),
  }));

  return (
    <>
      <h2 className="ev-page-title">Schedule</h2>
      <ScheduleView
        moments={moments}
        days={days}
        role={role}
        route={{ clientSlug, eventSlug, edition }}
        today={todayKey(context.engagement.startsOn)}
        base={base}
        tentative={((tentativeQ.data ?? []) as Array<{
          id: string;
          title: string;
          status: string;
          tentative_day: string | null;
          tentative_daypart: string | null;
        }>).map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          day: row.tentative_day ?? "",
          daypart: row.tentative_daypart ?? "anytime",
        }))}
      />
    </>
  );
}
