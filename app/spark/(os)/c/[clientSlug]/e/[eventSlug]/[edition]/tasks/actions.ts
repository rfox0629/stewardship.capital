"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";

/**
 * One verb: settle a task, or reopen it.
 *
 * Deliberately not a workflow engine. The weekly meeting needs "that is
 * handled" and occasionally "actually, it is not", and everything richer than
 * that has so far been a way for planning tools to make planners feel busy.
 *
 * Planner only, checked here and enforced again by RLS, with the result
 * measured in rows affected because RLS refuses silently.
 */

export type TaskOutcome = { ok: boolean };

export async function setTaskDone(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  taskId: string,
  done: boolean,
): Promise<TaskOutcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (context.role !== "planner") return { ok: false };

  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", taskId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(`/spark/c/${clientSlug}/e/${eventSlug}/${edition}/tasks`);
  return { ok: true };
}
