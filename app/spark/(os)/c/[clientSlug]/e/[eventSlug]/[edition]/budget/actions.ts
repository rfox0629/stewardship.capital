"use server";

import { revalidatePath } from "next/cache";

import { shapeLine } from "@lib/spark/budget";
import { resolveEngagement } from "@lib/spark/engagement";

/**
 * The planner's hands on the money.
 *
 * Planner only, checked here and enforced again by row level security, with
 * every mutation measured in rows affected rather than in the absence of an
 * error: an update a policy filters out returns no error and no rows, and
 * only the second of those is the truth.
 *
 * Nothing here decides anything. A line says what somebody typed, a ledger
 * says which pot it comes out of, and an overlap flag says two lines might be
 * the same money. Clearing that flag is the planner saying so, which is why
 * it is an action here and not a rule anywhere.
 */

export type LineOutcome = { ok: boolean; message?: string; id?: string };

const plannerContext = async (clientSlug: string, eventSlug: string, edition: string) => {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context || (context.role !== "planner" && !context.staff)) return null;
  return context;
};

const revalidate = (clientSlug: string, eventSlug: string, edition: string) => {
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  revalidatePath(`${base}/budget`);
  revalidatePath(base);
};

const read = (formData: FormData) => ({
  ledger: String(formData.get("ledger") ?? "event"),
  category: String(formData.get("category") ?? ""),
  label: String(formData.get("label") ?? ""),
  planned: String(formData.get("planned") ?? ""),
  committed: String(formData.get("committed") ?? ""),
  actual: String(formData.get("actual") ?? ""),
  status: String(formData.get("status") ?? ""),
  note: String(formData.get("note") ?? ""),
  vendor: String(formData.get("vendor") ?? ""),
  owner: String(formData.get("owner") ?? ""),
  link: String(formData.get("link") ?? ""),
});

export async function addBudgetLine(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  formData: FormData,
): Promise<LineOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const shaped = shapeLine(read(formData));
  if (!shaped.ok) return { ok: false, message: shaped.message };

  const { data, error } = await context.supabase
    .from("budget_lines")
    .insert({ engagement_id: context.engagement.id, ...shaped.row })
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save, so nothing was added." };
  }

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true, id: data?.[0]?.id };
}

export async function updateBudgetLine(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  lineId: string,
  formData: FormData,
): Promise<LineOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const shaped = shapeLine(read(formData));
  if (!shaped.ok) return { ok: false, message: shaped.message };

  /* The idea a cost came from is provenance and is never edited from here,
     the same way a moment never edits the spark behind it. */
  const { data, error } = await context.supabase
    .from("budget_lines")
    .update(shaped.row)
    .eq("id", lineId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save, so the line is unchanged." };
  }

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function deleteBudgetLine(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  lineId: string,
): Promise<LineOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("budget_lines")
    .delete()
    .eq("id", lineId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not delete, so the line is still there." };
  }

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

/**
 * Saying the overlap is settled.
 *
 * Both lines keep whatever they say; this only takes the question down, and
 * it is the one thing on this screen that is a judgement rather than a
 * record, so it is the planner who makes it and never the product.
 */
export async function settleOverlap(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  lineId: string,
): Promise<LineOutcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const { data, error } = await context.supabase
    .from("budget_lines")
    .update({ review_of: null })
    .eq("id", lineId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save, so the question is still open." };
  }

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}
