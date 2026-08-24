import { cache } from "react";

import { resolveAccess } from "./access.ts";
import { parseEngagementTheme, type EngagementTheme } from "./theme.ts";
import type { SparkRole, SparkWorkspace } from "./types.ts";
import { createClient } from "../supabase/server.ts";

/**
 * The one way a screen learns which engagement it is rendering.
 *
 * Everything is resolved under the signed in person's own session. The
 * membership comes from my_access on this request, the engagement row comes
 * back through row level security, and the data queries the screens run
 * afterwards use the same session, so RLS protects what is actually rendered
 * rather than only what could be asked for. No screen ever touches the
 * service role.
 *
 * Wrapped in React cache so the layout and the page share one resolution per
 * request instead of asking twice.
 */

export type EngagementContext = {
  /** This person's place in the engagement. Staff act as planners. */
  role: SparkRole;
  staff: boolean;
  workspace: SparkWorkspace;
  engagement: {
    id: string;
    name: string;
    campaign: string | null;
    summary: string | null;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
    location: string | null;
    venue: string | null;
    budgetTotalCents: number;
    guestsExpected: number;
    organizationName: string;
  };
  theme: EngagementTheme;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export const resolveEngagement = cache(
  async (
    clientSlug: string,
    eventSlug: string,
    editionSlug: string,
  ): Promise<EngagementContext | null> => {
    const supabase = await createClient().catch(() => null);
    if (!supabase) return null;

    const access = await resolveAccess(supabase);
    if (!access) return null;

    let workspace = access.workspaces.find(
      (candidate) =>
        candidate.clientSlug === clientSlug &&
        candidate.eventSlug === eventSlug &&
        candidate.editionSlug === editionSlug,
    );

    /* Platform staff may not hold a membership row. They still resolve the
       engagement through RLS, which their grant satisfies, and they act as
       planners because that is what the grant means. */
    if (!workspace && !access.staff) return null;

    const { data, error } = await supabase
      .from("engagements")
      .select(
        "id, name, campaign, summary, status, starts_on, ends_on, location, venue, budget_total_cents, guests_expected, theme, organizations!inner(slug, name, theme)",
      )
      .eq("organizations.slug", clientSlug)
      .eq("series_slug", eventSlug)
      .eq("edition_label", editionSlug)
      .maybeSingle();

    if (error || !data) return null;

    const organization = Array.isArray(data.organizations)
      ? data.organizations[0]
      : data.organizations;

    if (!workspace) {
      workspace = {
        engagementId: data.id,
        role: "planner",
        clientSlug,
        clientName: organization?.name ?? clientSlug,
        eventSlug,
        editionSlug,
        engagementName: data.name,
      };
    }

    /* The engagement theme wins field by field; the organization theme fills
       what the engagement leaves unsaid, today just the logo. */
    const orgTheme = parseEngagementTheme(organization?.theme);
    const theme = parseEngagementTheme(data.theme);
    if (!theme.images.organizationLogo && orgTheme.images.organizationLogo) {
      theme.images.organizationLogo = orgTheme.images.organizationLogo;
    }

    return {
      role: workspace.role,
      staff: access.staff,
      workspace,
      engagement: {
        id: data.id,
        name: data.name,
        campaign: data.campaign,
        summary: data.summary,
        status: data.status,
        startsOn: data.starts_on,
        endsOn: data.ends_on,
        location: data.location,
        venue: data.venue,
        budgetTotalCents: data.budget_total_cents ?? 0,
        guestsExpected: data.guests_expected ?? 0,
        organizationName: organization?.name ?? clientSlug,
      },
      theme,
      supabase,
    };
  },
);

/** October 1 to 4, 2026 from two dates, without a library. */
export const dateRangeLabel = (
  startsOn: string | null,
  endsOn: string | null,
): string | null => {
  if (!startsOn) return null;
  const format = (value: string, withYear: boolean) => {
    const date = new Date(`${value}T12:00:00Z`);
    const month = date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const day = date.getUTCDate();
    return withYear ? `${month} ${day}, ${date.getUTCFullYear()}` : `${month} ${day}`;
  };

  if (!endsOn || endsOn === startsOn) return format(startsOn, true);

  const start = new Date(`${startsOn}T12:00:00Z`);
  const end = new Date(`${endsOn}T12:00:00Z`);
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    const month = start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    return `${month} ${start.getUTCDate()} to ${end.getUTCDate()}, ${start.getUTCFullYear()}`;
  }
  return `${format(startsOn, false)} to ${format(endsOn, true)}`;
};
