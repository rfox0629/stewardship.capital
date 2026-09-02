"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";
import { IDEA_STATES, IDEA_STATE_TO_STATUS, type IdeaState } from "./idea-state";

/**
 * What anyone may do to an idea.
 *
 * Every call runs under the caller's own session, so row level security is
 * the last word; the checks here are the request level authorization in
 * front of it, and each mutation is judged by rows affected rather than by
 * the absence of an error, because RLS refuses silently.
 * The stored vocabulary is older than the product's: an idea being
 * considered is 'captured', one the team is talking about is 'discussing',
 * one that reached the plan is 'approved', and one set aside is 'parked'.
 * Renaming the column would buy nothing and cost a migration, so the
 * translation lives here, in one place.
 */

export type Outcome = { ok: boolean; message?: string };

const DAYS = ["wed", "thu", "fri", "sat", "sun"];
const DAYPARTS = ["morning", "afternoon", "evening", "anytime"];

const revalidate = (clientSlug: string, eventSlug: string, edition: string) => {
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/plan", "/schedule", "/actions", "/budget", ""]) {
    revalidatePath(`${base}${path}`);
  }
};

/**
 * An idea costs one line of typing. Everything else is optional and can be
 * added later from the idea itself, which is the whole point of capture: a
 * thought worth keeping should never wait on a form.
 */
export async function addIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  title: string,
  placement?: { day?: string | null; daypart?: string | null },
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role === "stakeholder") return { ok: false };

  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, message: "An idea needs a name." };

  const day = placement?.day && DAYS.includes(placement.day) ? placement.day : null;
  const daypart =
    day && placement?.daypart && DAYPARTS.includes(placement.daypart)
      ? placement.daypart
      : null;

  const { data, error } = await context.supabase
    .from("sparks")
    .insert({
      engagement_id: context.engagement.id,
      title: clean,
      status: "captured",
      tentative_day: day,
      tentative_daypart: daypart,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * Moving an idea between considering, discussing, and set aside is one
 * click, because deciding is a conversation the team has, not a workflow
 * the software administers. A reason may be given when something is set
 * aside; it is never demanded.
 */
export async function setIdeaState(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  state: IdeaState,
  reason?: string,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };
  if (!IDEA_STATES.includes(state)) return { ok: false };

  const settled = state === "aside" || state === "planned";
  const { data, error } = await context.supabase
    .from("sparks")
    .update({
      status: IDEA_STATE_TO_STATUS[state],
      decision: settled ? (reason ?? "").trim().slice(0, 400) || null : null,
      decided_at: settled ? new Date().toISOString() : null,
      decided_by_name: settled ? context.email.split("@")[0] : null,
    })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * Which day an idea might belong to, and roughly when. This is context, not
 * commitment: it changes no schedule row and settles nothing.
 */
export async function placeIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  day: string | null,
  daypart: string | null,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };
  if (day !== null && !DAYS.includes(day)) return { ok: false };
  if (daypart !== null && !DAYPARTS.includes(daypart)) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({
      tentative_day: day,
      tentative_daypart: day === null ? null : daypart,
    })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** A detail added after the fact, which is when detail usually arrives. */
export async function describeIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  detail: string,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ detail: detail.trim().slice(0, 600) || null })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function addIdeaNote(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  body: string,
): Promise<Outcome> {
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
      spark_id: ideaId,
      author_id: authorId,
      author_email: context.email,
      body: trimmed,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* ------------------------------------------------------- into the plan */

export type PlanDestination = "schedule" | "action" | "need";

const RESOURCE_KINDS = ["person", "vendor", "equipment", "supply", "deliverable"];

const cents = (value: string) => {
  const dollars = Number(value.trim());
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0;
};

/**
 * An idea becomes real without being typed twice.
 *
 * Three things it can become: something that happens (schedule), something
 * someone does (action), something that is needed (need). None is required
 * and any combination is fine. Each carries the idea's id, so the idea and
 * what came of it can always find each other, and the idea moves to planned
 * the first time anything comes of it.
 */
export async function addToPlan(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  destination: PlanDestination,
  formData: FormData,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };

  const { data: idea } = await context.supabase
    .from("sparks")
    .select("id, title, detail, tentative_day, tentative_daypart")
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .maybeSingle();

  if (!idea) return { ok: false };

  const text = (name: string, max = 200) =>
    String(formData.get(name) ?? "").trim().slice(0, max);
  const base = { engagement_id: context.engagement.id, spark_id: idea.id };
  const supabase = context.supabase;

  let result: { data: unknown[] | null; error: unknown } | null = null;

  if (destination === "schedule") {
    const day = text("day", 8);
    const starts = text("starts", 20).toLowerCase();
    const daypart = text("daypart", 12);
    if (!DAYS.includes(day)) return { ok: false, message: "Which day?" };
    /* A time is welcome but not required: an idea may become a real part of
       the weekend while still only knowing it belongs on Saturday evening. */
    if (starts && !/^\d{1,2}(:\d{2})?\s*(am|pm)$/.test(starts)) {
      return { ok: false, message: "A time like 2:00 pm, or leave it open." };
    }
    if (!starts && !DAYPARTS.includes(daypart)) {
      return { ok: false, message: "A time, or a part of the day." };
    }
    result = await supabase
      .from("schedule_items")
      .insert({
        ...base,
        day_key: day,
        starts_label: starts || null,
        daypart: starts ? null : daypart,
        ends_label: text("ends", 20).toLowerCase() || null,
        title: text("title") || idea.title,
        track: text("track", 40) || "Experience",
        location: text("location", 120) || null,
        status: "confirmed",
        position: 99,
      })
      .select("id");
  } else if (destination === "action") {
    result = await supabase
      .from("tasks")
      .insert({
        ...base,
        title: text("title") || idea.title,
        owner_name: text("owner", 80) || null,
        due_on: text("due", 20) || null,
        status: "todo",
        estimated_cents: cents(text("cost", 20)),
      })
      .select("id");
  } else if (destination === "need") {
    const kind = text("kind", 20);
    result = await supabase
      .from("resources")
      .insert({
        ...base,
        kind: RESOURCE_KINDS.includes(kind) ? kind : "supply",
        name: text("title") || idea.title,
        owner_name: text("owner", 80) || null,
        status: "needed",
        estimated_cents: cents(text("cost", 20)),
      })
      .select("id");
  }

  if (!result || result.error || (result.data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save." };
  }

  /* Something came of it, so the idea is in the plan. */
  await supabase
    .from("sparks")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by_name: context.email.split("@")[0] })
    .eq("id", idea.id)
    .eq("engagement_id", context.engagement.id)
    .neq("status", "approved");

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* ------------------------------------------------- ideas from reference */

/**
 * A reference item becomes an idea.
 *
 * The venue's amenities, the weekend's theme concepts, and the drink list are
 * reference: they sit under the plan and are never ideas by themselves. This
 * is the one door between them, taken deliberately, one item at a time, by
 * someone who has decided the thing is worth considering.
 */
export async function ideaFromReference(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  title: string,
  detail?: string,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner" && !context.staff) return { ok: false };

  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, message: "An idea needs a name." };

  /* The same reference item twice is a mistake, not a second idea. */
  const { data: existing } = await context.supabase
    .from("sparks")
    .select("id")
    .eq("engagement_id", context.engagement.id)
    .eq("title", clean)
    .maybeSingle();
  if (existing) return { ok: false, message: "That is already an idea." };

  const { data, error } = await context.supabase
    .from("sparks")
    .insert({
      engagement_id: context.engagement.id,
      title: clean,
      detail: detail?.trim().slice(0, 600) || null,
      status: "captured",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}
