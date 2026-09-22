"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";

/**
 * Ticking a duty off, as the person who did it.
 *
 * Editing the weekend is a planner's job. Recording that the bathrooms are
 * clean is the job of whoever cleaned them, and until now those were the same
 * permission, which left the volunteers unable to mark their own work. This
 * asks the database to change one status, through a function that checks
 * membership itself and can reach nothing but a duty's status.
 *
 * Choosing a name in the list is a filter, not an identity. This is the write
 * path, so it goes by the session.
 */

export type Outcome = { ok: boolean; message?: string };

export async function completeDuty(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  taskId: string,
  done: boolean,
): Promise<Outcome> {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const working = context.staff || context.role === "planner" || context.role === "client";
  if (!working) return { ok: false };

  const { data, error } = await context.supabase.rpc("set_duty_done", {
    p_task: taskId,
    p_done: done,
  });

  if (error || data !== true) return { ok: false, message: "That did not save." };

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/team", "/actions", ""]) revalidatePath(`${base}${path}`);
  revalidatePath("/shine/2026/team");

  return { ok: true };
}
