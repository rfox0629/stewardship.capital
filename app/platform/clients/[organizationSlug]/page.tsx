import { notFound, redirect } from "next/navigation";

import "@app/styles/site.css";
import "../../platform.css";

import { engagementHref, productLabel } from "@lib/platform/engagement-href";
import { clientThemeFor } from "@lib/platform/client-themes";
import { resolveAccess } from "@lib/spark/access";
import { PLATFORM_HOME, SPARK_ENTRY } from "@lib/spark/paths";
import { createClient } from "@lib/supabase/server";
import { ClientWorkspace, type ClientProject } from "../../_components/client-workspace";
import {
  ManageAccess,
  pendingInvitations,
  shortDate,
  type InvitationRow,
  type RosterRow,
  type TrailRow,
} from "../../_components/manage-access";

export const dynamic = "force-dynamic";

/**
 * One client on the platform: their projects, and who can reach each one.
 *
 * Wears the client's own identity through the theme registry, and opens each
 * project wherever that project actually lives: a product engagement in the
 * product, anything else on the platform's own engagement page. Staff only,
 * like everything under /platform; the guard refuses before this renders and
 * this asks again.
 */

type PageProps = { params: Promise<{ organizationSlug: string }> };

type EngagementRow = {
  id: string;
  name: string;
  slug: string;
  series_slug: string | null;
  edition_label: string | null;
  product_key: string | null;
  status: string;
  starts_on: string | null;
  location: string | null;
};

export async function generateMetadata({ params }: PageProps) {
  const { organizationSlug } = await params;
  return { title: clientThemeFor(organizationSlug).displayName ?? organizationSlug };
}

export default async function ClientPage({ params }: PageProps) {
  const { organizationSlug } = await params;

  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;
  if (!supabase || !access) redirect(PLATFORM_HOME);
  if (!access.staff) redirect(SPARK_ENTRY);

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", organizationSlug)
    .maybeSingle();
  if (!organization) notFound();

  const [{ data: engagements }, { data: invitations }] = await Promise.all([
    supabase
      .from("engagements")
      .select("id, name, slug, series_slug, edition_label, product_key, status, starts_on, location")
      .eq("organization_id", organization.id)
      .order("starts_on", { ascending: false }),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at, accepted_at, revoked_at, engagement_id")
      .order("created_at", { ascending: false }),
  ]);

  const engagementRows = (engagements ?? []) as EngagementRow[];
  const invitationRows = (invitations ?? []) as InvitationRow[];

  /* Roster and trail per engagement, through the staff scoped windows. */
  const details = new Map<string, { roster: RosterRow[]; trail: TrailRow[] }>();
  await Promise.all(
    engagementRows.map(async (engagement) => {
      const [{ data: roster }, { data: trail }] = await Promise.all([
        supabase.rpc("engagement_roster", { target: engagement.id }),
        supabase.rpc("membership_trail", { target: engagement.id, take: 6 }),
      ]);
      details.set(engagement.id, {
        roster: (roster ?? []) as RosterRow[],
        trail: (trail ?? []) as TrailRow[],
      });
    }),
  );

  const projects: ClientProject[] = engagementRows.map((engagement) => {
    const detail = details.get(engagement.id) ?? { roster: [], trail: [] };
    const pending = pendingInvitations(invitationRows, engagement.id);
    const product = productLabel(engagement.product_key);
    const meta = [
      engagement.status,
      product,
      shortDate(engagement.starts_on),
      engagement.location,
      `${detail.roster.length} member${detail.roster.length === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: engagement.id,
      name: engagement.name,
      meta,
      href: engagementHref({
        organizationSlug: organization.slug,
        engagementSlug: engagement.slug,
        seriesSlug: engagement.series_slug,
        editionLabel: engagement.edition_label,
        productKey: engagement.product_key,
      }),
      manage: (
        <ManageAccess
          engagementId={engagement.id}
          roster={detail.roster}
          pending={pending}
          trail={detail.trail}
        />
      ),
    };
  });

  return (
    <ClientWorkspace
      client={{ slug: organization.slug, name: organization.name }}
      projects={projects}
    />
  );
}
