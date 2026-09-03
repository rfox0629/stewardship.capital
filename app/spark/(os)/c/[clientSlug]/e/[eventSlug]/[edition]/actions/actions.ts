"use server";

import { revalidatePath } from "next/cache";

import { resolveEngagement } from "@lib/spark/engagement";

/**
 * What needs to happen, and who has it.
 *
 * Adding an action costs a title; an owner and a date are welcome whenever
 * they are known. Needs live here too, because a thing the weekend requires
 * and a job someone has to do are the same question asked twice.
 */

export type Outcome = { ok: boolean; message?: string };

const STATUSES = ["todo", "doing", "blocked", "done"];
const KINDS = ["person", "vendor", "equipment", "supply", "deliverable"];

const plannerContext = async (clientSlug: string, eventSlug: string, edition: string) => {
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context || (context.role !== "planner" && !context.staff)) return null;
  return context;
};

const revalidate = (clientSlug: string, eventSlug: string, edition: string) => {
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  for (const path of ["/actions", "/budget", "/plan", "/schedule", ""]) {
    revalidatePath(`${base}${path}`);
  }
};

export async function addAction(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  fields: { title: string; owner?: string; due?: string },
): Promise<Outcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const title = fields.title.trim().slice(0, 200);
  if (!title) return { ok: false, message: "An action needs a name." };

  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      engagement_id: context.engagement.id,
      title,
      owner_name: fields.owner?.trim().slice(0, 80) || null,
      due_on: fields.due?.trim() || null,
      status: "todo",
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function updateAction(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  actionId: string,
  patch: { title?: string; owner?: string | null; due?: string | null; status?: string },
): Promise<Outcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, 200);
    if (!title) return { ok: false, message: "An action needs a name." };
    update.title = title;
  }
  if (patch.owner !== undefined) update.owner_name = patch.owner?.trim().slice(0, 80) || null;
  if (patch.due !== undefined) update.due_on = patch.due || null;
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return { ok: false };
    update.status = patch.status;
  }
  if (Object.keys(update).length === 0) return { ok: false };

  const { data, error } = await context.supabase
    .from("tasks")
    .update(update)
    .eq("id", actionId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function addNeed(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  fields: { name: string; kind?: string; cost?: string },
): Promise<Outcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };

  const name = fields.name.trim().slice(0, 200);
  if (!name) return { ok: false, message: "A need has a name." };

  const dollars = Number((fields.cost ?? "").trim());
  const { data, error } = await context.supabase
    .from("resources")
    .insert({
      engagement_id: context.engagement.id,
      name,
      kind: fields.kind && KINDS.includes(fields.kind) ? fields.kind : "supply",
      status: "needed",
      estimated_cents:
        Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false, message: "That did not save." };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}

export async function setNeedStatus(
  clientSlug: string,
  eventSlug: string,
  edition: string,
  needId: string,
  status: string,
): Promise<Outcome> {
  const context = await plannerContext(clientSlug, eventSlug, edition);
  if (!context) return { ok: false };
  if (!["needed", "holding", "confirmed"].includes(status)) return { ok: false };

  const { data, error } = await context.supabase
    .from("resources")
    .update({ status })
    .eq("id", needId)
    .eq("engagement_id", context.engagement.id)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidate(clientSlug, eventSlug, edition);
  return { ok: true };
}
