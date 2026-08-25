"use server";

import { revalidatePath } from "next/cache";

import { DAY_ORDER } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";

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

  const fields = readFields(formData);
  if (!fields) return { ok: false, message: "A title, a day, a time like 3:00 pm, and a track." };

  const { data, error } = await context.supabase
    .from("schedule_items")
    .insert({
      engagement_id: context.engagement.id,
      day_key: fields.day,
      starts_label: fields.starts,
      ends_label: fields.ends,
      title: fields.title,
      track: fields.track,
      location: fields.location,
      status: fields.status,
      note: fields.note,
      position: 99,
    })
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
