import { notFound, redirect } from "next/navigation";

import { DAY_NAMES, parseTimeLabel } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { PlanTabs } from "../plan-tabs";
import { IdeaBoard, type Idea } from "./board";
import { toIdeaState } from "./idea-state";

export const metadata = { title: "Plan" };

/**
 * Everything each idea has become, gathered in one pass.
 *
 * The idea is the anchor, so this reads outward from it: the moments it is,
 * the moments it sits inside, the actions carrying it, what it requires, what
 * it costs, and the notes about it. Rows come through the reader's own
 * session, so a guest never arrives here.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type Row = {
  id: string;
  title: string;
  detail: string | null;
  open_question: string | null;
  question_answer: string | null;
  status: string;
  decision: string | null;
  tentative_day: string | null;
  tentative_daypart: string | null;
};

export default async function PlanPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const planner = context.role === "planner" || context.staff;
  const engagementId = context.engagement.id;
  const supabase = context.supabase;

  const [ideasQ, notesQ, momentsQ, actionsQ, needsQ, costsQ, cuesQ] = await Promise.all([
    supabase.from("sparks")
      .select("id, title, detail, open_question, question_answer, status, decision, tentative_day, tentative_daypart")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    supabase.from("spark_notes")
      .select("spark_id, author_email, body, created_at")
      .eq("engagement_id", engagementId).order("created_at", { ascending: true }),
    supabase.from("schedule_items")
      .select("id, spark_id, day_key, starts_label, ends_label, daypart, title")
      .eq("engagement_id", engagementId),
    supabase.from("tasks")
      .select("id, spark_id, title, owner_name, due_on, status")
      .eq("engagement_id", engagementId).not("spark_id", "is", null),
    supabase.from("resources")
      .select("id, spark_id, name, kind, status")
      .eq("engagement_id", engagementId).not("spark_id", "is", null),
    supabase.from("budget_lines")
      .select("id, spark_id, label, planned_cents")
      .eq("engagement_id", engagementId).not("spark_id", "is", null),
    planner
      ? supabase.from("run_of_show_cues")
          .select("id, spark_id, schedule_item_id, offset_minutes, cue")
          .eq("engagement_id", engagementId).not("spark_id", "is", null)
      : Promise.resolve({ data: [] as Array<{ id: string; spark_id: string; schedule_item_id: string; offset_minutes: number | null; cue: string }> }),
  ]);

  const moments = (momentsQ.data ?? []) as Array<{
    id: string; spark_id: string | null; day_key: string;
    starts_label: string | null; ends_label: string | null; daypart: string | null; title: string;
  }>;
  const momentById = new Map(moments.map((row) => [row.id, row]));

  const when = (row: { day_key: string; starts_label: string | null; ends_label: string | null; daypart: string | null }) =>
    `${DAY_NAMES[row.day_key] ?? row.day_key} ${
      row.starts_label ? row.starts_label + (row.ends_label ? ` to ${row.ends_label}` : "") : row.daypart ?? ""
    }`.trim();

  const bucket = <T,>() => new Map<string, T[]>();
  const push = <T,>(map: Map<string, T[]>, key: string | null, value: T) => {
    if (!key) return;
    map.set(key, [...(map.get(key) ?? []), value]);
  };

  const schedule = bucket<Idea["schedule"][number]>();
  for (const row of moments) {
    push(schedule, row.spark_id, {
      id: row.id,
      label: `${when(row)}, ${row.title}`,
      href: `${base}/schedule?open=${row.id}`,
      at: row.starts_label,
    });
  }

  const inMoments = bucket<Idea["inMoments"][number]>();
  for (const row of cuesQ.data ?? []) {
    const moment = momentById.get(row.schedule_item_id);
    if (!moment) continue;
    push(inMoments, row.spark_id, {
      id: row.id,
      label: `${moment.title} · ${when(moment)}`,
      href: `${base}/schedule?open=${moment.id}&tab=ros`,
    });
  }

  const actions = bucket<Idea["actions"][number]>();
  for (const row of (actionsQ.data ?? []) as Array<{ id: string; spark_id: string; title: string; owner_name: string | null; due_on: string | null; status: string }>) {
    push(actions, row.spark_id, {
      id: row.id, title: row.title,
      sub: [row.owner_name, row.status === "done" ? "done" : row.due_on ? `due ${row.due_on}` : null]
        .filter(Boolean).join(" · "),
    });
  }

  const requirements = bucket<Idea["requirements"][number]>();
  for (const row of (needsQ.data ?? []) as Array<{ id: string; spark_id: string; name: string; kind: string; status: string }>) {
    push(requirements, row.spark_id, { id: row.id, name: row.name, sub: `${row.kind} · ${row.status}` });
  }

  const costs = bucket<Idea["costs"][number]>();
  for (const row of (costsQ.data ?? []) as Array<{ id: string; spark_id: string; label: string; planned_cents: number }>) {
    push(costs, row.spark_id, { id: row.id, label: row.label, cents: row.planned_cents });
  }

  const notes = bucket<Idea["notes"][number]>();
  for (const row of notesQ.data ?? []) {
    push(notes, row.spark_id, {
      author: row.author_email ? String(row.author_email).split("@")[0] : null,
      body: row.body,
      at: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }

  const ideas: Idea[] = ((ideasQ.data ?? []) as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail,
    question: row.open_question,
    answer: row.question_answer,
    state: toIdeaState(row.status),
    reason: row.decision,
    day: row.tentative_day,
    daypart: row.tentative_daypart,
    schedule: schedule.get(row.id) ?? [],
    inMoments: inMoments.get(row.id) ?? [],
    actions: actions.get(row.id) ?? [],
    requirements: requirements.get(row.id) ?? [],
    costs: costs.get(row.id) ?? [],
    notes: notes.get(row.id) ?? [],
  }));

  /* Every scheduled moment, so an idea can be placed inside one. */
  const momentOptions = moments
    .slice()
    .sort((a, b) =>
      a.day_key.localeCompare(b.day_key) ||
      (parseTimeLabel(a.starts_label) ?? 9999) - (parseTimeLabel(b.starts_label) ?? 9999))
    .map((row) => ({ id: row.id, label: `${when(row)} · ${row.title}` }));

  return (
    <>
      <h2 className="ws-title">Plan</h2>
      <PlanTabs base={base} active="ideas" />
      <IdeaBoard ideas={ideas} route={{ clientSlug, eventSlug, edition }}
        planner={planner} moments={momentOptions} />
    </>
  );
}
