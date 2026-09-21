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
 * Nothing here decides anything. A line records what somebody typed and what
 * they answered to the two questions: does this spend the weekend's budget,
 * and does SHINE keep it afterwards. Neither answer is ever inferred from the
 * other, here or anywhere.
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
  kind: String(formData.get("kind") ?? "allocation"),
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
  counts: String(formData.get("counts") ?? ""),
  reusable: String(formData.get("reusable") ?? ""),
  reuseNote: String(formData.get("reuse_note") ?? ""),
});

/**
 * The line this one is detail about, if any.
 *
 * Checked against this engagement's own lines, because a parent from another
 * engagement would be both a leak and a total that made no sense. A line
 * cannot be detail about itself; longer loops are read as no parent at all
 * when the totals are computed, so money is never quietly dropped.
 */
const readParent = async (
  context: NonNullable<Awaited<ReturnType<typeof plannerContext>>>,
  formData: FormData,
  selfId: string | null,
): Promise<{ ok: true; id: string | null } | { ok: false; message: string }> => {
  const wanted = String(formData.get("parent") ?? "").trim();
  if (!wanted) return { ok: true, id: null };
  if (wanted === selfId) return { ok: false, message: "A line cannot be detail about itself." };

  const { data } = await context.supabase
    .from("budget_lines")
    .select("id")
    .eq("id", wanted)
    .eq("engagement_id", context.engagement.id);

  if ((data?.length ?? 0) === 0) return { ok: false, message: "That line is not in this budget." };
  return { ok: true, id: wanted };
};

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

  const parent = await readParent(context, formData, null);
  if (!parent.ok) return { ok: false, message: parent.message };

  const { data, error } = await context.supabase
    .from("budget_lines")
    .insert({ engagement_id: context.engagement.id, parent_id: parent.id, ...shaped.row })
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

  const parent = await readParent(context, formData, lineId);
  if (!parent.ok) return { ok: false, message: parent.message };

  /* The idea a cost came from is provenance and is never edited from here,
     the same way a moment never edits the spark behind it. */
  const { data, error } = await context.supabase
    .from("budget_lines")
    .update({ parent_id: parent.id, ...shaped.row })
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
