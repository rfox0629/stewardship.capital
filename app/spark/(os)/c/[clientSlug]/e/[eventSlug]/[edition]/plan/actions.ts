"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";
import { shapeMoment } from "@lib/spark/schedule-moment";
import { IDEA_STATE_TO_STATUS, type IdeaState } from "./idea-state";

/**
 * Everything that can happen to an idea.
 *
 * The idea is the anchor. Nothing here consumes it, replaces it, or moves it
 * along a pipeline: a schedule moment, an action, a requirement, a cost and a
 * run of show cue all point back at the same row, so the title is typed once
 * and everything that comes of it can find its way home.
 *
 * Every call runs under the caller's own session, so row level security is
 * the last word, and each mutation is judged by rows affected rather than by
 * the absence of an error, because RLS refuses silently.
 */

export type Outcome = { ok: boolean; message?: string };
/* Scheduling hands back the row it made, so the caller can stop drawing its
   own placeholder the moment that exact row arrives, rather than guessing
   from the hour it was dropped on. An hour is not an identity: the block can
   be moved a second later, and a placeholder keyed on where it landed comes
   back from the dead looking like a copy. */
export type ScheduleOutcome = Outcome & { id?: string };

/* Rough placement. null is unplaced, 'all' spans the event, a day is a
   guess about where it belongs. None of these is a schedule. */
const PLACEMENTS = ["all", "wed", "thu", "fri", "sat", "sun"];
const DAYS = ["wed", "thu", "fri", "sat", "sun"];
const DAYPARTS = ["morning", "afternoon", "evening", "anytime"];
const KINDS = ["person", "vendor", "equipment", "supply", "deliverable"];

const revalidate = (clientSlug: string, eventSlug: string, edition: string) => {
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/plan", "/schedule", "/actions", "/budget", ""]) {
    revalidatePath(`${base}${path}`);
  }
};

const planner = async (clientSlug: string, eventSlug: string, edition: string) => {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context || (context.role !== "planner" && !context.staff)) return null;
  return context;
};

/* --------------------------------------------------------- the idea itself */

/** An idea costs one line of typing, and nothing else is ever required. */
export async function addIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  title: string,
  day?: string | null,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role === "stakeholder") return { ok: false };

  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, message: "An idea needs a name." };

  const { data, error } = await context.supabase
    .from("sparks")
    .insert({
      engagement_id: context.engagement.id,
      title: clean,
      status: "captured",
      tentative_day: day && PLACEMENTS.includes(day) ? day : null,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** The title is the idea, so it is edited in place rather than re-entered. */
export async function renameIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  title: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, message: "An idea needs a name." };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ title: clean })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** The standing description. Notes are the running commentary; this is not. */
export async function describeIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  detail: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ detail: detail.trim().slice(0, 1000) || null })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * The open question. Attention, not a stage: an idea carrying one can still
 * be scheduled, costed and acted on.
 */
export async function setIdeaQuestion(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  question: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ open_question: question.trim().slice(0, 400) || null })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * Answering the question.
 *
 * The flag comes off and the answer stays, because what a room decided is
 * worth more than the fact that it once had to decide. A yes or a no is
 * enough when it is enough; a sentence is there when it is not.
 */
export async function answerIdeaQuestion(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  answer: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const clean = answer.trim().slice(0, 400);
  if (!clean) return { ok: false, message: "What was decided?" };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ question_answer: clean, open_question: null })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** Set aside, or bring back. The only state a person manages. */
export async function setIdeaState(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  state: IdeaState,
  reason?: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const aside = state === "aside";
  const { data, error } = await context.supabase
    .from("sparks")
    .update({
      status: IDEA_STATE_TO_STATUS[state],
      decision: aside ? (reason ?? "").trim().slice(0, 400) || null : null,
      decided_at: aside ? new Date().toISOString() : null,
      decided_by_name: aside ? context.email.split("@")[0] : null,
    })
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** Where an idea might sit, loosely, before anything is committed. */
export async function placeIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  day: string | null,
  daypart: string | null,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (day !== null && !PLACEMENTS.includes(day)) return { ok: false };
  if (daypart !== null && !DAYPARTS.includes(daypart)) return { ok: false };

  const { data, error } = await context.supabase
    .from("sparks")
    .update({ tentative_day: day, tentative_daypart: day === null ? null : daypart })
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

/* ------------------------------------------------------------ into the plan */

/**
 * Its own moment on the weekend.
 *
 * A time is welcome and a part of day is allowed, because the sheet this
 * came from writes both. Scheduling is itself the decision, so nothing had
 * to be approved first.
 */
export async function scheduleIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  fields: { day: string; starts?: string; minutes?: string; daypart?: string; track?: string; location?: string },
): Promise<ScheduleOutcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (!DAYS.includes(fields.day)) return { ok: false, message: "Which day?" };

  const { data: idea } = await context.supabase
    .from("sparks")
    .select("id, title")
    .eq("id", ideaId)
    .eq("engagement_id", context.engagement.id)
    .maybeSingle();
  if (!idea) return { ok: false };

  /* Every door to the schedule shapes its row the same way. */
  const shaped = shapeMoment({
    title: idea.title,
    day: fields.day,
    starts: fields.starts,
    minutes: fields.minutes,
    daypart: fields.daypart,
    track: fields.track,
    location: fields.location,
    sparkId: idea.id,
  });
  if (!shaped.ok) return { ok: false, message: shaped.message };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .insert({ engagement_id: context.engagement.id, ...shaped.row })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true, id: data?.[0]?.id as string | undefined };
}

/**
 * Inside somebody else's moment.
 *
 * A take home stake does not deserve half an hour of the calendar; it is a
 * beat inside the message. So the idea becomes a cue in that moment's run of
 * show, pointing back at itself, and its Scripture, requirements and costs
 * are not copied anywhere.
 */
export async function placeIdeaInMoment(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  momentId: string,
  /* A number of minutes puts the idea at a known point inside the moment.
     Blank means it happens in there somewhere: boat rides during free time
     do not start at 1:15 just because something had to be written down. */
  offsetMinutes: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const raw = (offsetMinutes ?? "").trim();
  const offset = raw === "" ? null : Number(raw);
  if (offset !== null && (!Number.isInteger(offset) || offset < -120 || offset > 720)) {
    return { ok: false, message: "Minutes from the start of that moment, or leave it blank." };
  }

  const [{ data: idea }, { data: moment }] = await Promise.all([
    context.supabase.from("sparks").select("id, title")
      .eq("id", ideaId).eq("engagement_id", context.engagement.id).maybeSingle(),
    context.supabase.from("schedule_items").select("id, starts_label")
      .eq("id", momentId).eq("engagement_id", context.engagement.id).maybeSingle(),
  ]);
  if (!idea || !moment) return { ok: false };

  const { data, error } = await context.supabase
    .from("run_of_show_cues")
    .insert({
      engagement_id: context.engagement.id,
      schedule_item_id: moment.id,
      spark_id: idea.id,
      offset_minutes: offset,
      at_label: moment.starts_label ?? "",
      cue: idea.title,
      position: 99,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/** Someone has to do something. It keeps naming the idea it came from. */
export async function addIdeaAction(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  fields: { title?: string; owner?: string; due?: string },
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data: idea } = await context.supabase
    .from("sparks").select("id, title")
    .eq("id", ideaId).eq("engagement_id", context.engagement.id).maybeSingle();
  if (!idea) return { ok: false };

  const title = (fields.title ?? "").trim().slice(0, 200) || idea.title;
  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      engagement_id: context.engagement.id,
      spark_id: idea.id,
      title,
      owner_name: (fields.owner ?? "").trim().slice(0, 80) || null,
      due_on: (fields.due ?? "").trim() || null,
      status: "todo",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * Something that must exist or be true. Deliberately not an action: sixty
 * rope sections is a fact about the experience, and buying rope is a job
 * somebody does. Either can exist without the other.
 */
export async function addIdeaRequirement(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  fields: { name?: string; kind?: string },
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data: idea } = await context.supabase
    .from("sparks").select("id, title")
    .eq("id", ideaId).eq("engagement_id", context.engagement.id).maybeSingle();
  if (!idea) return { ok: false };

  const name = (fields.name ?? "").trim().slice(0, 200) || idea.title;
  const { data, error } = await context.supabase
    .from("resources")
    .insert({
      engagement_id: context.engagement.id,
      spark_id: idea.id,
      name,
      kind: KINDS.includes(fields.kind ?? "") ? fields.kind : "supply",
      status: "needed",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * What a part of this idea costs.
 *
 * Cost lives in one table and nowhere else. An action that explains a cost
 * does not carry the number, and neither does a requirement, so the budget
 * can add the lines up without ever counting the same money twice.
 */
export async function addIdeaCost(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
  fields: { label?: string; dollars?: string },
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const amount = Number((fields.dollars ?? "").trim());
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: "An amount." };

  const { data: idea } = await context.supabase
    .from("sparks").select("id, title")
    .eq("id", ideaId).eq("engagement_id", context.engagement.id).maybeSingle();
  if (!idea) return { ok: false };

  const { data, error } = await context.supabase
    .from("budget_lines")
    .insert({
      engagement_id: context.engagement.id,
      spark_id: idea.id,
      category: "From ideas",
      label: (fields.label ?? "").trim().slice(0, 200) || idea.title,
      planned_cents: Math.round(amount * 100),
      status: "estimate",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* ------------------------------------------------- reference becomes an idea */

export async function ideaFromReference(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  title: string,
  detail?: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, message: "An idea needs a name." };

  const { data: existing } = await context.supabase
    .from("sparks").select("id")
    .eq("engagement_id", context.engagement.id).eq("title", clean).maybeSingle();
  if (existing) return { ok: false, message: "That is already an idea." };

  const { data, error } = await context.supabase
    .from("sparks")
    .insert({
      engagement_id: context.engagement.id,
      title: clean,
      detail: detail?.trim().slice(0, 1000) || null,
      status: "captured",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* ------------------------------------------------------------------ removal */

/**
 * Only for the mis-typed and the duplicated.
 *
 * An idea that already became part of the plan is not a mistake, so the
 * check runs here as well as on the screen: the server refuses whatever
 * arrives, however it arrives.
 */
export async function deleteIdea(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  ideaId: string,
): Promise<Outcome> {
  const context = await planner(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const engagementId = context.engagement.id;
  const counts = await Promise.all(
    (["schedule_items", "tasks", "resources", "budget_lines", "run_of_show_cues"] as const).map(
      (table) =>
        context.supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("engagement_id", engagementId)
          .eq("spark_id", ideaId),
    ),
  );

  if (counts.some((result) => (result.count ?? 0) > 0)) {
    return {
      ok: false,
      message: "Already in the plan. Remove its planned items before deleting this idea.",
    };
  }

  const { data, error } = await context.supabase
    .from("sparks").delete()
    .eq("id", ideaId).eq("engagement_id", engagementId).select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not delete." };
  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}
