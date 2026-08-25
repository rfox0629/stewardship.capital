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
      decided_by_name: settled ? context.email.split("@")[0] : null,
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

export type PlanDestination = "schedule" | "task" | "resource";

export type AddToPlanOutcome = { ok: boolean; message?: string };

const RESOURCE_KINDS = ["person", "vendor", "equipment", "supply", "deliverable"];

/** Dollars in a form field become cents, or zero. Never negative, never NaN. */
const cents = (formData: FormData, name: string) => {
  const dollars = Number(String(formData.get(name) ?? "").trim());
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0;
};

/**
 * An approved idea becomes part of the plan, without being typed twice.
 *
 * Three destinations, and only three: something happens (schedule), someone
 * does something (task), something is needed (resource). None is required and
 * any combination is fine; each is one deliberate choice carrying the spark's
 * id so provenance holds in both directions. Budget is not a destination:
 * costs ride the task or resource that incurs them and the budget page adds
 * them up.
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
        estimated_cents: cents(formData, "cost"),
      })
      .select("id");
  } else if (destination === "resource") {
    const kind = text("kind", 20);
    result = await supabase
      .from("resources")
      .insert({
        ...base,
        kind: RESOURCE_KINDS.includes(kind) ? kind : "supply",
        name: text("title") || spark.title,
        detail: text("detail", 400) || spark.detail,
        quantity: text("quantity", 60) || null,
        owner_name: text("owner") || null,
        status: "needed",
        estimated_cents: cents(formData, "cost"),
      })
      .select("id");
  }

  if (!result || result.error || (result.data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save." };
  }

  const prefix = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/sparks", "/schedule", "/tasks", "/budget", "/resources", ""]) {
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
