import { notFound, redirect } from "next/navigation";

import { DAY_NAMES, parseTimeLabel } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { SparkBoard, type BoardSpark } from "./board";

export const metadata = { title: "Sparks" };

/**
 * The board explains itself; this page only gathers what it shows. Rows come
 * through the reader's own session, so guests never reach here and clients
 * see the working surface without the planner's hands.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type SparkRow = {
  id: string;
  title: string;
  detail: string | null;
  category: string;
  status: string;
  raised_by_name: string | null;
  decision: string | null;
  tentative_day: string | null;
  tentative_daypart: string | null;
};

export default async function SparksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const planner = context.role === "planner" || context.staff;
  const engagementId = context.engagement.id;
  const supabase = context.supabase;

  const [sparksQ, notesQ, scheduleQ, tasksQ, budgetQ, resourcesQ, decisionsQ, cuesQ] =
    await Promise.all([
      supabase
        .from("sparks")
        .select("id, title, detail, category, status, raised_by_name, decision, tentative_day, tentative_daypart")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: false }),
      supabase
        .from("spark_notes")
        .select("spark_id, author_email, body, created_at")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: true }),
      supabase
        .from("schedule_items")
        .select("id, spark_id, day_key, starts_label, title")
        .eq("engagement_id", engagementId),
      supabase.from("tasks").select("spark_id, title").eq("engagement_id", engagementId).not("spark_id", "is", null),
      supabase.from("budget_lines").select("spark_id, label, planned_cents").eq("engagement_id", engagementId).not("spark_id", "is", null),
      supabase.from("resources").select("spark_id, name").eq("engagement_id", engagementId).not("spark_id", "is", null),
      supabase.from("decisions").select("spark_id, question").eq("engagement_id", engagementId).not("spark_id", "is", null),
      planner
        ? supabase.from("run_of_show_cues").select("spark_id, at_label, cue").eq("engagement_id", engagementId).not("spark_id", "is", null)
        : Promise.resolve({ data: [] as Array<{ spark_id: string; at_label: string; cue: string }> }),
    ]);

  const links = new Map<string, BoardSpark["links"]>();
  const push = (sparkId: string | null, kind: string, label: string, href: string) => {
    if (!sparkId) return;
    links.set(sparkId, [...(links.get(sparkId) ?? []), { kind, label, href }]);
  };
  for (const row of scheduleQ.data ?? []) {
    if (row.spark_id) {
      push(row.spark_id, "Schedule",
        `${DAY_NAMES[row.day_key] ?? row.day_key} ${row.starts_label}, ${row.title}`,
        `${base}/schedule`);
    }
  }
  for (const row of tasksQ.data ?? []) push(row.spark_id, "Task", row.title, `${base}/tasks`);
  for (const row of budgetQ.data ?? [])
    push(row.spark_id, "Budget", `${row.label}, $${Math.round(row.planned_cents / 100).toLocaleString()}`, `${base}/budget`);
  for (const row of resourcesQ.data ?? []) push(row.spark_id, "Resource", row.name, `${base}/resources`);
  for (const row of decisionsQ.data ?? []) push(row.spark_id, "Decision", row.question, `${base}/decisions`);
  for (const row of (cuesQ.data ?? []) as Array<{ spark_id: string; at_label: string; cue: string }>)
    push(row.spark_id, "Run of show", `${row.at_label}, ${row.cue}`, `${base}/run-of-show`);

  const notes = new Map<string, BoardSpark["notes"]>();
  for (const row of notesQ.data ?? []) {
    const entry = {
      author: row.author_email ? String(row.author_email).split("@")[0] : null,
      body: row.body,
      at: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    notes.set(row.spark_id, [...(notes.get(row.spark_id) ?? []), entry]);
  }

  const sparks: BoardSpark[] = ((sparksQ.data ?? []) as SparkRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail,
    category: row.category,
    status: row.status,
    raisedBy: row.raised_by_name,
    decision: row.decision,
    day: row.tentative_day,
    daypart: row.tentative_daypart,
    links: links.get(row.id) ?? [],
    notes: notes.get(row.id) ?? [],
  }));

  const scheduleMoments = ((scheduleQ.data ?? []) as Array<{ id: string; day_key: string; starts_label: string; title: string }>)
    .sort(
      (a, b) =>
        a.day_key.localeCompare(b.day_key) ||
        (parseTimeLabel(a.starts_label) ?? 9999) - (parseTimeLabel(b.starts_label) ?? 9999),
    )
    .map((row) => ({
      id: row.id,
      label: `${DAY_NAMES[row.day_key] ?? row.day_key} ${row.starts_label}, ${row.title}`,
    }));

  return (
    <>
      <h2 className="ev-page-title">Sparks</h2>
      <SparkBoard
        sparks={sparks}
        route={{ clientSlug, eventSlug, edition }}
        planner={planner}
        scheduleMoments={scheduleMoments}
      />
    </>
  );
}
