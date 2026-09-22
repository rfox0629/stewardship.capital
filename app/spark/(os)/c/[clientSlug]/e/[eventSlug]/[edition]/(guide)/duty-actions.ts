"use server";

import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

import { resolveEngagement } from "@lib/spark/engagement";
import { EVENT_COOKIE, sha256 } from "@lib/spark/event-code";
import { createClient } from "@lib/supabase/server";

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
  const token = (await cookies()).get(EVENT_COOKIE)?.value ?? null;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  const working = Boolean(
    context && (context.staff || context.role === "planner" || context.role === "client"),
  );

  /* Either credential is enough to record work: a working membership, or the
     weekend's code. Neither is enough for anything else, which the function
     below decides rather than this one. */
  if (!working && !token) return { ok: false };

  const supabase = context?.supabase ?? (await createClient().catch(() => null));
  if (!supabase) return { ok: false };

  const { data, error } = await supabase.rpc("set_duty_done", {
    p_task: taskId,
    p_done: done,
    p_token_hash: token ? sha256(token) : null,
  });

  if (error || data !== true) return { ok: false, message: "That did not save." };

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/team", "/actions", ""]) revalidatePath(`${base}${path}`);
  revalidatePath("/shine/2026/team");

  return { ok: true };
}
