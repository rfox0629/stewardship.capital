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

  const [ideasQ, notesQ, scheduleQ, actionsQ, needsQ] = await Promise.all([
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
  ]);

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
