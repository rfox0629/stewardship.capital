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
