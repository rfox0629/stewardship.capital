"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";

/**
 * The two things anyone may do to a spark, as server actions.
 *
 * Both run under the caller's own session, so row level security is the last
 * word; the checks here are the request level authorization in front of it,
 * and both measure rows affected rather than trusting the absence of an
 * error, because RLS refuses silently.
 */

const CATEGORIES = [
  "Experience",
  "Hospitality",
  "Program",
  "Generosity",
  "Logistics",
  "Communications",
];

export type CaptureOutcome = { ok: boolean };

export async function captureSpark(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  formData: FormData,
): Promise<CaptureOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role === "stakeholder") return { ok: false };

  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 600);
  const category = String(formData.get("category") ?? "");

  if (!title || !CATEGORIES.includes(category)) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .insert({
      engagement_id: context.engagement.id,
      title,
      detail: detail || null,
      category,
      status: "captured",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/sparks`);
  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}`);
  return { ok: true };
}

const TRANSITIONS: Record<string, string[]> = {
  /* Where a spark may move from where it stands. Discernment is a doorway,
     not a bypass: nothing goes straight from captured to approved. */
  captured: ["discussing"],
  discussing: ["approved", "parked", "declined"],
  parked: ["discussing"],
  declined: [],
  approved: [],
};

export async function decideSpark(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  sparkId: string,
  next: string,
  decision?: string,
): Promise<CaptureOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  /* Discernment belongs to the planner. The client raises and discusses;
     the decision is not theirs to click. RLS enforces the same line. */
  if (context.role !== "planner") return { ok: false };

  const { data: current } = await context.supabase
    .from("sparks")
    .select("status")
    .eq("id", sparkId)
    .eq("engagement_id", context.engagement.id)
    .maybeSingle();

  if (!current || !TRANSITIONS[current.status]?.includes(next)) {
    return { ok: false };
  }

  const settled = next === "approved" || next === "parked" || next === "declined";

  const { data, error } = await context.supabase
    .from("sparks")
    .update({
      status: next,
      decision: settled ? (decision ?? "").trim().slice(0, 400) || null : null,
      decided_at: settled ? new Date().toISOString() : null,
    })
    .eq("id", sparkId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  /* Zero rows is a refusal, whatever the error field says. */
  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/sparks`);
  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}`);
  return { ok: true };
}

/* ------------------------------------------------------- into the plan */

export type PlanDestination =
  | "schedule"
  | "task"
  | "budget"
  | "resource"
  | "decision"
  | "run-of-show";

export type AddToPlanOutcome = { ok: boolean; message?: string };

/**
 * An approved idea becomes part of the plan, without being typed twice.
 *
 * The spark stays what it always was, the original idea; what this creates is
 * the downstream record, carrying the spark's id so provenance holds in both
 * directions. One spark may feed several destinations, one call each, and
 * nothing is created that the planner did not explicitly ask for.
 *
 * Planner only, approved sparks only. Discernment stays human: this runs
 * after the decision, never instead of it.
 */
export async function addToPlan(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  sparkId: string,
  destination: PlanDestination,
  formData: FormData,
): Promise<AddToPlanOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };

  const { data: spark } = await context.supabase
    .from("sparks")
    .select("id, title, detail, status")
    .eq("id", sparkId)
    .eq("engagement_id", context.engagement.id)
    .maybeSingle();

  if (!spark || spark.status !== "approved") {
    return { ok: false, message: "Only an approved spark moves into the plan." };
  }

  const text = (name: string, max = 160) =>
    String(formData.get(name) ?? "").trim().slice(0, max);
  const base = {
    engagement_id: context.engagement.id,
    spark_id: spark.id,
  };

  let result: { data: unknown[] | null; error: unknown } | null = null;
  const supabase = context.supabase;

  if (destination === "schedule") {
    const day = text("day");
    const starts = text("starts").toLowerCase();
    if (!day || !/^\d{1,2}(:\d{2})?\s*(am|pm)$/.test(starts)) {
      return { ok: false, message: "A day and a start time like 7:30 pm." };
    }
    result = await supabase
      .from("schedule_items")
      .insert({
        ...base,
        day_key: day,
        starts_label: starts,
        ends_label: text("ends").toLowerCase() || null,
        title: text("title") || spark.title,
        track: text("track") || "Experience",
        location: text("location") || null,
        status: "draft",
        position: 99,
      })
      .select("id");
  } else if (destination === "task") {
    result = await supabase
      .from("tasks")
      .insert({
        ...base,
        title: text("title") || spark.title,
        owner_name: text("owner") || null,
        due_on: text("due") || null,
        area: text("area") || null,
        status: "todo",
      })
      .select("id");
  } else if (destination === "budget") {
    const dollars = Number(text("planned"));
    if (!Number.isFinite(dollars) || dollars < 0) {
      return { ok: false, message: "A planned amount in dollars." };
    }
    result = await supabase
      .from("budget_lines")
      .insert({
        ...base,
        category: text("category") || "Experience",
        label: text("title") || spark.title,
        planned_cents: Math.round(dollars * 100),
      })
      .select("id");
  } else if (destination === "resource") {
    result = await supabase
      .from("resources")
      .insert({
        ...base,
        kind: text("kind") === "vendor" ? "vendor" : "supply",
        name: text("title") || spark.title,
        detail: text("detail", 400) || spark.detail,
        quantity: text("quantity", 60) || null,
        status: "needed",
      })
      .select("id");
  } else if (destination === "decision") {
    const question = text("question", 300) || `${spark.title}?`;
    result = await supabase
      .from("decisions")
      .insert({
        ...base,
        question,
        context: text("context", 400) || spark.detail,
        owner_name: text("owner") || null,
        needs_by: text("due") || null,
        status: "open",
      })
      .select("id");
  } else if (destination === "run-of-show") {
    const scheduleItemId = text("scheduleItemId", 64);
    const at = text("at").toLowerCase();
    if (!scheduleItemId || !/^\d{1,2}(:\d{2})?\s*(am|pm)$/.test(at)) {
      return { ok: false, message: "A schedule moment and a cue time." };
    }
    result = await supabase
      .from("run_of_show_cues")
      .insert({
        ...base,
        schedule_item_id: scheduleItemId,
        at_label: at,
        cue: text("cue", 300) || spark.title,
        who_name: text("who") || null,
        position: 99,
      })
      .select("id");
  }

  if (!result || result.error || (result.data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save." };
  }

  const prefix = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/sparks", "/schedule", "/tasks", "/budget", "/resources", "/decisions", "/run-of-show", ""]) {
    revalidatePath(`${prefix}${path}`);
  }
  return { ok: true };
}

/* ------------------------------------------------------------- notes */

export async function addSparkNote(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  sparkId: string,
  body: string,
): Promise<CaptureOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role === "stakeholder") return { ok: false };

  const trimmed = body.trim().slice(0, 1000);
  if (!trimmed) return { ok: false };

  const { data: me } = await context.supabase.auth.getClaims();
  const authorId = (me?.claims as { sub?: string } | undefined)?.sub ?? null;

  const { data, error } = await context.supabase
    .from("spark_notes")
    .insert({
      engagement_id: context.engagement.id,
      spark_id: sparkId,
      author_id: authorId,
      author_email: context.email,
      body: trimmed,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/sparks`);
  return { ok: true };
}

/* --------------------------------------------------------- placement */

const PLACE_DAYS = ["thu", "fri", "sat", "sun"];
const DAYPARTS = ["morning", "afternoon", "evening", "anytime"];

/**
 * Moves an idea around the shape of the weekend, and nothing else. The
 * discernment state does not change and no schedule row is touched: this is
 * the handwritten sheet's gesture of writing an idea under a day.
 */
export async function placeSpark(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  sparkId: string,
  day: string | null,
  daypart: string | null,
): Promise<CaptureOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };

  if (day !== null && !PLACE_DAYS.includes(day)) return { ok: false };
  if (daypart !== null && !DAYPARTS.includes(daypart)) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({
      tentative_day: day,
      tentative_daypart: day === null ? null : daypart,
    })
    .eq("id", sparkId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  const prefix = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  revalidatePath(`${prefix}/sparks`);
  revalidatePath(`${prefix}/schedule`);
  return { ok: true };
}
