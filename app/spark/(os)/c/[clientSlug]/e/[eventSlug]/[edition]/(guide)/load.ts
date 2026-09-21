import { cache } from "react";

import { resolveEngagement } from "@lib/spark/engagement";
import {
  readActivities,
  readDrinks,
  readGuestCopy,
  readOps,
  type Duty,
  type Guide,
  type GuideMoment,
  type OpenDecision,
} from "@lib/spark/guide";
import { parseEngagementTheme, type EngagementTheme } from "@lib/spark/theme";
import { createClient } from "@lib/supabase/server";

/**
 * Reading the weekend, for a guest and for the team.
 *
 * A guest reads through weekend_guide() and nothing else. It works without a
 * session, it refuses an engagement that has not published a guide, and it
 * names every field it returns, so no internal detail can reach a guest's
 * page even by accident here.
 *
 * The team reads the same rows through their own session and row level
 * security, plus the operational detail and duties that only working members
 * can select. Both readings start from the same schedule_items rows: nothing
 * is copied, so a time changed in the calendar is changed in both.
 */

type Row = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

export type LoadedGuide = { guide: Guide; theme: EngagementTheme };

export const loadGuide = cache(
  async (clientSlug: string, eventSlug: string, edition: string): Promise<LoadedGuide | null> => {
    const supabase = await createClient().catch(() => null);
    if (!supabase) return null;

    const { data, error } = await supabase.rpc("weekend_guide", {
      p_client: clientSlug,
      p_series: eventSlug,
      p_edition: edition,
    });
    if (error || !data || typeof data !== "object") return null;

    const raw = data as Row;
    const theme = parseEngagementTheme(raw.theme);
    const orgLogo = parseEngagementTheme(raw.organizationTheme).images.organizationLogo;
    if (!theme.images.organizationLogo && orgLogo) theme.images.organizationLogo = orgLogo;

    const moments: GuideMoment[] = (Array.isArray(raw.moments) ? (raw.moments as Row[]) : []).map((row) => ({
      id: String(row.id),
      day: String(row.day),
      starts: str(row.starts),
      ends: str(row.ends),
      title: String(row.title ?? ""),
      location: str(row.location),
      window: row.window === true,
      guide: readGuestCopy(row.guide),
    }));

    return {
      theme,
      guide: {
        name: String(raw.name ?? ""),
        organization: String(raw.organization ?? ""),
        startsOn: str(raw.startsOn),
        endsOn: str(raw.endsOn),
        location: str(raw.location),
        venue: str(raw.venue),
        published: raw.published === true,
        moments,
        activities: readActivities(raw.activities),
        coffee: readDrinks(raw.coffee),
      },
    };
  },
);

export type TeamReading = {
  moments: GuideMoment[];
  duties: Duty[];
  decisions: OpenDecision[];
  /** Only planners edit the calendar or tick duties off. */
  canEdit: boolean;
};

/**
 * The team's reading: every moment, Wednesday to Sunday, with how it runs.
 *
 * Returns null for anyone who is not a working member, even though the route
 * guard already refused them: a page that trusted the guard alone would be
 * one misconfigured matcher away from showing a guest the run of show.
 */
export const loadTeam = cache(
  async (clientSlug: string, eventSlug: string, edition: string): Promise<TeamReading | null> => {
    const context = await resolveEngagement(clientSlug, eventSlug, edition);
    if (!context) return null;
    const working = context.staff || context.role === "planner" || context.role === "client";
    if (!working) return null;

    const engagementId = context.engagement.id;
    const [momentsQ, opsQ, tasksQ, decisionsQ, questionsQ] = await Promise.all([
      context.supabase
        .from("schedule_items")
        .select("id, day_key, starts_label, ends_label, title, location, display_mode, audience, status, guest_guide")
        .eq("engagement_id", engagementId),
      context.supabase
        .from("schedule_item_ops")
        .select("schedule_item_id, detail")
        .eq("engagement_id", engagementId),
      context.supabase
        .from("tasks")
        .select("id, title, owner_name, status, schedule_item_id, duty")
        .eq("engagement_id", engagementId)
        .not("duty", "is", null),
      context.supabase
        .from("decisions")
        .select("id, question, context, owner_name, status")
        .eq("engagement_id", engagementId)
        .eq("status", "open")
        .order("created_at", { ascending: true }),
      context.supabase
        .from("sparks")
        .select("id, title, open_question, status")
        .eq("engagement_id", engagementId)
        .not("open_question", "is", null),
    ]);

    const ops = new Map(
      ((opsQ.data ?? []) as Row[]).map((row) => [String(row.schedule_item_id), readOps(row.detail)]),
    );

    const moments: GuideMoment[] = ((momentsQ.data ?? []) as Row[])
      .filter((row) => row.status === "confirmed" || context.role === "planner" || context.staff)
      .map((row) => ({
        id: String(row.id),
        day: String(row.day_key),
        starts: str(row.starts_label),
        ends: str(row.ends_label),
        title: String(row.title ?? ""),
        location: str(row.location),
        window: row.display_mode === "background",
        guide: readGuestCopy(row.guest_guide),
        teamOnly: row.audience === "planner",
        ops: ops.get(String(row.id)) ?? null,
      }));

    const duties: Duty[] = ((tasksQ.data ?? []) as Row[]).map((row) => {
      const duty = (row.duty ?? {}) as Row;
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        owner: str(row.owner_name),
        phase: str(duty.phase) ?? "tbd",
        when: str(duty.when),
        notes: str(duty.notes),
        status: String(row.status ?? "todo"),
        momentId: str(row.schedule_item_id),
        order: typeof duty.order === "number" ? duty.order : 999,
      };
    });

    const decisions: OpenDecision[] = [
      ...((decisionsQ.data ?? []) as Row[]).map((row) => ({
        id: String(row.id),
        question: String(row.question ?? ""),
        context: str(row.context),
        owner: str(row.owner_name),
        fromIdea: false,
      })),
      /* Questions still carried on ideas. The idea bank is no longer on
         screen, so what it was asking is surfaced here instead of vanishing
         with it. */
      ...((questionsQ.data ?? []) as Row[])
        .filter((row) => row.status !== "parked")
        .map((row) => ({
          id: String(row.id),
          question: String(row.open_question ?? ""),
          context: `From the idea "${String(row.title ?? "")}"`,
          owner: null,
          fromIdea: true,
        })),
    ];

    return {
      moments,
      duties,
      decisions,
      canEdit: context.staff || context.role === "planner",
    };
  },
);
