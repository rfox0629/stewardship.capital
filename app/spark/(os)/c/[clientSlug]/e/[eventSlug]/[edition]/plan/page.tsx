import { notFound, redirect } from "next/navigation";

import { DAY_NAMES } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { PlanTabs } from "../plan-tabs";
import { IdeaBoard, type Idea } from "./board";

export const metadata = { title: "Plan" };

/**
 * The ideas side of the plan. The board explains itself; this page only
 * gathers what it shows, through the reader's own session, so a guest never
 * arrives here and a client sees the working surface without the planner's
 * hands on it.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type Row = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  decision: string | null;
  decided_by_name: string | null;
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

  const [ideasQ, notesQ, scheduleQ, actionsQ, needsQ, costQ, cuesQ] = await Promise.all([
    supabase
      .from("sparks")
      .select("id, title, detail, status, decision, decided_by_name, tentative_day, tentative_daypart")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    supabase
      .from("spark_notes")
      .select("spark_id, author_email, body, created_at")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    supabase
      .from("schedule_items")
      .select("id, spark_id, day_key, starts_label, daypart, title")
      .eq("engagement_id", engagementId)
      .not("spark_id", "is", null),
    supabase
      .from("tasks")
      .select("spark_id, title, owner_name")
      .eq("engagement_id", engagementId)
      .not("spark_id", "is", null),
    supabase
      .from("resources")
      .select("spark_id, name, status")
      .eq("engagement_id", engagementId)
      .not("spark_id", "is", null),
    supabase
      .from("budget_lines")
      .select("spark_id, planned_cents")
      .eq("engagement_id", engagementId)
      .not("spark_id", "is", null),
    planner
      ? supabase
          .from("run_of_show_cues")
          .select("spark_id, cue, schedule_item_id")
          .eq("engagement_id", engagementId)
          .not("spark_id", "is", null)
      : Promise.resolve({ data: [] as Array<{ spark_id: string; cue: string; schedule_item_id: string }> }),
  ]);

  /* A requirement that is still only "needed" is an open loose end. */
  const unresolved = new Set(
    (needsQ.data ?? []).filter((row) => row.status === "needed").map((row) => row.spark_id),
  );

  const cost = new Map<string, number>();
  for (const row of costQ.data ?? []) {
    if (row.spark_id) cost.set(row.spark_id, row.planned_cents);
  }

  const links = new Map<string, Idea["links"]>();
  const push = (id: string | null, kind: string, label: string, href: string) => {
    if (!id) return;
    links.set(id, [...(links.get(id) ?? []), { kind, label, href }]);
  };
  for (const row of scheduleQ.data ?? []) {
    const when = row.starts_label ?? row.daypart ?? "";
    push(row.spark_id, "Schedule",
      `${DAY_NAMES[row.day_key] ?? row.day_key} ${when}, ${row.title}`.trim(),
      `${base}/schedule?open=${row.id}`);
  }
  for (const row of actionsQ.data ?? [])
    push(row.spark_id, "Action", [row.title, row.owner_name].filter(Boolean).join(" · "), `${base}/actions`);
  for (const row of needsQ.data ?? [])
    push(row.spark_id, "Need", row.name, `${base}/actions`);
  for (const row of costQ.data ?? [])
    push(row.spark_id, "Budget", `$${Math.round(row.planned_cents / 100).toLocaleString()}`, `${base}/budget`);
  for (const row of (cuesQ.data ?? []) as Array<{ spark_id: string; cue: string; schedule_item_id: string }>)
    push(row.spark_id, "Run of show", row.cue, `${base}/schedule?open=${row.schedule_item_id}&tab=ros`);

  const notes = new Map<string, Idea["notes"]>();
  for (const row of notesQ.data ?? []) {
    notes.set(row.spark_id, [
      ...(notes.get(row.spark_id) ?? []),
      {
        author: row.author_email ? String(row.author_email).split("@")[0] : null,
        body: row.body,
        at: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      },
    ]);
  }

  const ideas: Idea[] = ((ideasQ.data ?? []) as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail,
    status: row.status,
    day: row.tentative_day,
    daypart: row.tentative_daypart,
    decision: row.decision,
    decidedBy: row.decided_by_name,
    costDollars: cost.has(row.id) ? Math.round((cost.get(row.id) as number) / 100) : null,
    needsUnresolved: unresolved.has(row.id),
    links: links.get(row.id) ?? [],
    notes: notes.get(row.id) ?? [],
  }));

  return (
    <>
      <h2 className="ws-title">Plan</h2>
      <PlanTabs base={base} active="ideas" />
      <IdeaBoard ideas={ideas} route={{ clientSlug, eventSlug, edition }} planner={planner} />
    </>
  );
}
