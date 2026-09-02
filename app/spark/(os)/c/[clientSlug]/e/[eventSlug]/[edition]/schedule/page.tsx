import { notFound } from "next/navigation";

import { DAY_NAMES, DAY_ORDER, dayDateLabel, parseTimeLabel, todayKey } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { PlanTabs } from "../plan-tabs";
import { ScheduleView, type Cue, type DayLane, type Moment, type RelatedRecord } from "./schedule-view";

export const metadata = { title: "Schedule" };

/**
 * One query for every role; row level security is the editor. A guest's
 * session only receives confirmed items, so drafts, notes, provenance, the
 * run of show, and the team's Wednesday never leave the database for them.
 * Cues and related records are fetched only for planners, before rendering:
 * what a guest must not see is never in their payload to begin with.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type Row = {
  id: string;
  day_key: string;
  starts_label: string | null;
  ends_label: string | null;
  daypart: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
  spark_id: string | null;
  spark: { title: string } | { title: string }[] | null;
};

type CueRow = {
  id: string;
  schedule_item_id: string;
  offset_minutes: number | null;
  cue: string;
  who_name: string | null;
  note: string | null;
};

export default async function SchedulePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  const role = context.staff ? "planner" : context.role;
  const planner = role === "planner";
  const engagementId = context.engagement.id;

  const [momentsQ, tentativeQ, cuesQ, tasksQ, resourcesQ] = await Promise.all([
    context.supabase
      .from("schedule_items")
      .select(
        "id, day_key, starts_label, ends_label, daypart, title, track, location, status, note, spark_id, spark:sparks(title)",
      )
      .eq("engagement_id", engagementId),
    planner
      ? context.supabase
          .from("sparks")
          .select("id, title, status, tentative_day, tentative_daypart")
          .eq("engagement_id", engagementId)
          .not("tentative_day", "is", null)
          .in("status", ["captured", "discussing", "approved"])
      : Promise.resolve({ data: [] }),
    planner
      ? context.supabase
          .from("run_of_show_cues")
          .select("id, schedule_item_id, offset_minutes, cue, who_name, note")
          .eq("engagement_id", engagementId)
      : Promise.resolve({ data: [] as CueRow[] }),
    planner
      ? context.supabase
          .from("tasks")
          .select("id, title, owner_name, due_on, status, schedule_item_id, spark_id")
          .eq("engagement_id", engagementId)
      : Promise.resolve({ data: [] }),
    planner
      ? context.supabase
          .from("resources")
          .select("id, name, kind, status, owner_name, estimated_cents, schedule_item_id, spark_id")
          .eq("engagement_id", engagementId)
      : Promise.resolve({ data: [] }),
  ]);

  const moments: Moment[] = ((momentsQ.data ?? []) as Row[]).map((row) => ({
    id: row.id,
    day: row.day_key,
    starts: row.starts_label,
    ends: row.ends_label,
    title: row.title,
    track: row.track,
    location: row.location,
    status: row.status,
    note: row.note,
    daypart: row.daypart,
    sparkId: row.spark_id,
    sparkTitle: (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title ?? null,
    minutes: parseTimeLabel(row.starts_label),
    endMinutes: parseTimeLabel(row.ends_label),
  }));

  const cues: Cue[] = ((cuesQ.data ?? []) as CueRow[])
    .filter((row) => row.offset_minutes !== null)
    .map((row) => ({
      id: row.id,
      momentId: row.schedule_item_id,
      offset: row.offset_minutes as number,
      cue: row.cue,
      who: row.who_name,
      note: row.note,
    }));

  /* A task or resource belongs in a moment's drawer if it points at the
     moment directly, or descends from the same spark. */
  const related: RelatedRecord[] = [];
  const sparkToMoments = new Map<string, string[]>();
  for (const moment of moments) {
    if (moment.sparkId) {
      sparkToMoments.set(moment.sparkId, [
        ...(sparkToMoments.get(moment.sparkId) ?? []),
        moment.id,
      ]);
    }
  }
  const attach = (
    kind: "task" | "resource",
    row: { id: string; schedule_item_id: string | null; spark_id: string | null },
    label: string,
    sub: string,
  ) => {
    const momentIds = new Set<string>();
    if (row.schedule_item_id) momentIds.add(row.schedule_item_id);
    for (const id of sparkToMoments.get(row.spark_id ?? "") ?? []) momentIds.add(id);
    for (const momentId of momentIds) {
      related.push({ id: row.id, momentId, kind, label, sub });
    }
  };
  for (const row of (tasksQ.data ?? []) as Array<{
    id: string; title: string; owner_name: string | null; due_on: string | null;
    status: string; schedule_item_id: string | null; spark_id: string | null;
  }>) {
    attach("task", row, row.title,
      [row.owner_name, row.status === "done" ? "done" : row.due_on ? `due ${row.due_on}` : null]
        .filter(Boolean).join(" · "));
  }
  for (const row of (resourcesQ.data ?? []) as Array<{
    id: string; name: string; kind: string; status: string; owner_name: string | null;
    estimated_cents: number; schedule_item_id: string | null; spark_id: string | null;
  }>) {
    attach("resource", row, row.name,
      [row.kind, row.status,
        row.estimated_cents > 0 ? `$${Math.round(row.estimated_cents / 100).toLocaleString()}` : null]
        .filter(Boolean).join(" · "));
  }

  const present = new Set(moments.map((moment) => moment.day));
  const days: DayLane[] = DAY_ORDER.filter(
    (key) => key !== "wed" || present.has("wed") || planner,
  ).map((key) => ({
    key,
    name: DAY_NAMES[key],
    date: dayDateLabel(context.engagement.startsOn, key),
  }));

  return (
    <>
      <h2 className="ws-title">{role === "stakeholder" ? "Schedule" : "Plan"}</h2>
      {role !== "stakeholder" ? <PlanTabs base={base} active="weekend" /> : null}
      <ScheduleView
        moments={moments}
        days={days}
        role={role}
        route={{ clientSlug, eventSlug, edition }}
        today={todayKey(context.engagement.startsOn)}
        base={base}
        cues={cues}
        related={related}
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
