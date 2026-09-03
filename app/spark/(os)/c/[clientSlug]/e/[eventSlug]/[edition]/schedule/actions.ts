"use server";

import { revalidatePath } from "next/cache";

import { DAY_ORDER } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { shapeMoment } from "@lib/spark/schedule-moment";

/**
 * The planner's hands on the schedule: add a moment, change it, take it away.
 *
 * Planner only, checked here on every call and enforced again by RLS, with
 * every mutation measured in rows affected. Editing never touches the spark a
 * moment came from; provenance is read only from this side.
 */

export type MomentOutcome = { ok: boolean; message?: string };

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];
const TIME = /^\d{1,2}(:\d{2})?\s*(am|pm)$/i;

type MomentFields = {
  day: string;
  starts: string;
  ends: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
};

const readFields = (formData: FormData): MomentFields | null => {
  const day = String(formData.get("day") ?? "");
  const starts = String(formData.get("starts") ?? "").trim().toLowerCase();
  const ends = String(formData.get("ends") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const track = String(formData.get("track") ?? "");
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const status = String(formData.get("status") ?? "draft");
  const note = String(formData.get("note") ?? "").trim().slice(0, 400);

  if (!(DAY_ORDER as readonly string[]).includes(day)) return null;
  if (!TIME.test(starts)) return null;
  if (ends && !TIME.test(ends)) return null;
  if (!title || !TRACKS.includes(track)) return null;
  if (status !== "draft" && status !== "confirmed") return null;

  return {
    day,
    starts,
    ends: ends || null,
    title,
    track,
    location: location || null,
    status,
    note: note || null,
  };
};

const plannerContext = async (clientSlug: string, eventSlug: string, edition: string) => {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context || (context.role !== "planner" && !context.staff)) return null;
  return context;
};

const revalidate = (clientSlug: string, eventSlug: string, edition: string) => {
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  revalidatePath(`${base}/schedule`);
  revalidatePath(base);
};

export async function createMoment(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  /* The same shaping every other door to the schedule uses. A moment added
     here simply has no idea behind it, which is the honest answer for
     breakfast: nobody needed to consider whether it happens. */
  const shaped = shapeMoment({
    title: String(formData.get("title") ?? ""),
    day: String(formData.get("day") ?? ""),
    starts: String(formData.get("starts") ?? ""),
    minutes: String(formData.get("minutes") ?? ""),
    ends: String(formData.get("ends") ?? ""),
    daypart: String(formData.get("daypart") ?? ""),
    track: String(formData.get("track") ?? ""),
    location: String(formData.get("location") ?? ""),
    sparkId: null,
  });
  if (!shaped.ok) return { ok: false, message: shaped.message };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .insert({ engagement_id: context.engagement.id, ...shaped.row })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function updateMoment(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const fields = readFields(formData);
  if (!fields) return { ok: false, message: "A title, a day, a time like 3:00 pm, and a track." };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .update({
      day_key: fields.day,
      starts_label: fields.starts,
      ends_label: fields.ends,
      title: fields.title,
      track: fields.track,
      location: fields.location,
      status: fields.status,
      note: fields.note,
    })
    .eq("id", momentId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function deleteMoment(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .delete()
    .eq("id", momentId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * What a drag commits: a new day and time, or a new end, and nothing else.
 * The same real row moves; nothing is duplicated to simulate movement.
 */
export async function rescheduleMoment(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
  change: { day?: string; starts?: string; ends?: string | null },
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const patch: Record<string, string | null> = {};
  if (change.day !== undefined) {
    if (!(DAY_ORDER as readonly string[]).includes(change.day)) return { ok: false };
    patch.day_key = change.day;
  }
  if (change.starts !== undefined) {
    if (!TIME.test(change.starts)) return { ok: false };
    patch.starts_label = change.starts.toLowerCase();
  }
  if (change.ends !== undefined) {
    if (change.ends !== null && !TIME.test(change.ends)) return { ok: false };
    patch.ends_label = change.ends ? change.ends.toLowerCase() : null;
  }
  if (Object.keys(patch).length === 0) return { ok: false };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .update(patch)
    .eq("id", momentId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* ------------------------------------------------------ the run of show */

/**
 * Cues live inside a scheduled moment and are timed relative to its start,
 * so a moment that moves takes its cues along without anyone rebuilding
 * anything. Changing a moment's duration deliberately does not stretch the
 * offsets: they are explicit, and the editor surfaces any cue that has
 * fallen outside the moment instead of quietly rescaling it.
 */

const OFFSET_MIN = -120;
const OFFSET_MAX = 12 * 60;

const readCue = (formData: FormData) => {
  const offset = Number(String(formData.get("offset") ?? "").trim());
  const cue = String(formData.get("cue") ?? "").trim().slice(0, 300);
  const who = String(formData.get("who") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!cue || !Number.isInteger(offset) || offset < OFFSET_MIN || offset > OFFSET_MAX) {
    return null;
  }
  return { offset, cue, who: who || null, note: note || null };
};

/** The moment, only if it is this engagement's. Cues never cross that line. */
const momentOf = async (
  context: NonNullable<Awaited<ReturnType<typeof plannerContext>>>,
  momentId: string,
) => {
  const { data } = await context.supabase
    .from("schedule_items")
    .select("id, title, starts_label")
    .eq("id", momentId)
    .eq("engagement_id", context.engagement.id)
    .maybeSingle();
  return data;
};

export async function addCue(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const fields = readCue(formData);
  if (!fields) return { ok: false, message: "A cue and a whole number of minutes." };

  const moment = await momentOf(context, momentId);
  if (!moment) return { ok: false };

  const { data, error } = await context.supabase
    .from("run_of_show_cues")
    .insert({
      engagement_id: context.engagement.id,
      schedule_item_id: momentId,
      offset_minutes: fields.offset,
      at_label: moment.starts_label,
      cue: fields.cue,
      who_name: fields.who,
      note: fields.note,
      position: 99,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function updateCue(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  cueId: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const fields = readCue(formData);
  if (!fields) return { ok: false, message: "A cue and a whole number of minutes." };

  const { data, error } = await context.supabase
    .from("run_of_show_cues")
    .update({
      offset_minutes: fields.offset,
      cue: fields.cue,
      who_name: fields.who,
      note: fields.note,
    })
    .eq("id", cueId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function deleteCue(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  cueId: string,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("run_of_show_cues")
    .delete()
    .eq("id", cueId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/* -------------------------------------- what a moment needs, in one place */

/**
 * A task or resource born inside a moment's drawer, so the working meeting
 * never leaves the calendar to record what a moment needs. The record lands
 * in the same tables as everywhere else, linked to the moment.
 */
export async function addMomentTask(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  if (!title) return { ok: false, message: "A title." };
  const moment = await momentOf(context, momentId);
  if (!moment) return { ok: false };

  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      engagement_id: context.engagement.id,
      schedule_item_id: momentId,
      title,
      owner_name: String(formData.get("owner") ?? "").trim().slice(0, 80) || null,
      due_on: String(formData.get("due") ?? "").trim() || null,
      status: "todo",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/tasks`);
  return { ok: true };
}

const MOMENT_RESOURCE_KINDS = ["person", "vendor", "equipment", "supply", "deliverable"];

export async function addMomentResource(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  momentId: string,
  formData: FormData,
): Promise<MomentOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const kind = String(formData.get("kind") ?? "");
  if (!name || !MOMENT_RESOURCE_KINDS.includes(kind)) {
    return { ok: false, message: "A name and a kind." };
  }
  const moment = await momentOf(context, momentId);
  if (!moment) return { ok: false };

  /* No money here. Cost belongs to the idea, in one place, so the budget
     never adds the same number twice. */
  const { data, error } = await context.supabase
    .from("resources")
    .insert({
      engagement_id: context.engagement.id,
      schedule_item_id: momentId,
      kind,
      name,
      status: "needed",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/resources`);
  return { ok: true };
}
