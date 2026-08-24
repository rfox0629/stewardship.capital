import Link from "next/link";
import { notFound } from "next/navigation";

import "@app/styles/site.css";
import "./platform.css";

import { SiteNav } from "@app/(www)/_components/site-nav";
import { resolveAccess } from "@lib/spark/access";
import { createClient } from "../../../../lib/supabase/server";
import {
  EngagementForm,
  InvitationForm,
  MemberControls,
  OrganizationForm,
  RevokeInvitationButton,
  StaffForm,
} from "./platform-controls";

export const metadata = { title: { absolute: "Platform | Spark" } };
export const dynamic = "force-dynamic";

/**
 * The Stewardship.Capital operating surface: every client, every engagement,
 * who can reach each one, and the door for the next person in.
 *
 * Explicit platform staff only, checked by the route guard before this
 * renders and again right here, and every row below comes through RLS or a
 * definer function that makes the same check a third time. Not a dashboard;
 * the one page that lets Brooke and Ryan run Spark without a terminal.
 */

type EngagementRow = {
  id: string;
  name: string;
  series_slug: string | null;
  edition_label: string | null;
  status: string;
  starts_on: string | null;
  location: string | null;
  organization_id: string;
};

type RosterRow = { user_id: string; email: string; role: string; since: string };
type TrailRow = {
  at: string;
  action: string;
  subject_email: string | null;
  actor_email: string | null;
  from_role: string | null;
  to_role: string | null;
};
type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  engagement_id: string;
};

const shortDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

const trailLine = (event: TrailRow) => {
  const who = event.subject_email ?? "someone";
  const by = event.actor_email ? ` by ${event.actor_email}` : "";
  if (event.action === "added") return `${who} added as ${event.to_role}${by}`;
  if (event.action === "removed") return `${who} removed (was ${event.from_role})${by}`;
  return `${who} changed from ${event.from_role} to ${event.to_role}${by}`;
};

export default async function PlatformPage() {
  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;
  if (!supabase || !access?.staff) notFound();

  const [{ data: organizations }, { data: engagements }, { data: invitations }] =
    await Promise.all([
      supabase.from("organizations").select("id, slug, name").order("name"),
      supabase
        .from("engagements")
        .select("id, name, series_slug, edition_label, status, starts_on, location, organization_id")
        .order("starts_on", { ascending: false }),
      supabase
        .from("invitations")
        .select("id, email, role, expires_at, accepted_at, revoked_at, engagement_id")
        .order("created_at", { ascending: false }),
    ]);

  const engagementRows = (engagements ?? []) as EngagementRow[];

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

  const pendingFor = (engagementId: string) =>
    ((invitations ?? []) as InvitationRow[]).filter(
      (invitation) =>
        invitation.engagement_id === engagementId &&
        !invitation.accepted_at &&
        !invitation.revoked_at &&
        new Date(invitation.expires_at).getTime() > Date.now(),
    );

  return (
    <div className="pf">
      <SiteNav />
      <div className="pf-shell">
        <header className="pf-head">
          <div>
            <h1 className="pf-title">Platform</h1>
            <p className="pf-lede">
              Every client and engagement on Spark, who can reach each one, and
              the door for the next person in. Access changes take effect on
              the person&apos;s next request.
            </p>
          </div>
          <form action="/spark/signout" method="post">
            <button className="pf-text-action" type="submit">
              Sign out
            </button>
          </form>
        </header>

        <section className="pf-section" aria-label="Clients and engagements">
          <div className="pf-section-head">
            <h2 className="pf-section-title">Clients</h2>
            <span className="pf-note">
              {(organizations ?? []).length} on the platform
            </span>
          </div>

          {(organizations ?? []).map((organization) => (
            <div key={organization.id} className="pf-org">
              <p className="pf-org-name">
                {organization.name}
                <span className="pf-org-slug">/{organization.slug}</span>
              </p>

              {engagementRows
                .filter((engagement) => engagement.organization_id === organization.id)
                .map((engagement) => {
                  const detail = details.get(engagement.id);
                  const pending = pendingFor(engagement.id);
                  const home = `/spark/c/${organization.slug}/e/${
                    engagement.series_slug ?? "current"
                  }/${engagement.edition_label ?? "current"}`;

                  return (
                    <details key={engagement.id} className="pf-engagement">
                      <summary>
                        <span className="pf-eng-name">{engagement.name}</span>
                        <span className="pf-eng-meta">
                          {engagement.status}
                          {engagement.starts_on
                            ? ` · ${shortDate(engagement.starts_on)}`
                            : ""}
                          {engagement.location ? ` · ${engagement.location}` : ""}
                          {" · "}
                          {detail?.roster.length ?? 0} member
                          {(detail?.roster.length ?? 0) === 1 ? "" : "s"}
                        </span>
                        <Link className="pf-eng-open" href={home}>
                          Open workspace
                        </Link>
                      </summary>

                      <div className="pf-eng-body">
                        <p className="pf-sub">Members</p>
                        {detail && detail.roster.length > 0 ? (
                          <ul className="pf-rows">
                            {detail.roster.map((member) => (
                              <li key={member.user_id}>
                                <span className="pf-grow">{member.email}</span>
                                <MemberControls
                                  engagementId={engagement.id}
                                  userId={member.user_id}
                                  role={member.role}
                                  email={member.email}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="pf-quiet">
                            Nobody yet. The first invitation below changes that.
                          </p>
                        )}

                        {pending.length > 0 ? (
                          <>
                            <p className="pf-sub">Pending invitations</p>
                            <ul className="pf-rows">
                              {pending.map((invitation) => (
                                <li key={invitation.id}>
                                  <span className="pf-grow">
                                    {invitation.email}
                                    <span className="pf-quiet">
                                      {" "}
                                      as {invitation.role}, until{" "}
                                      {shortDate(invitation.expires_at)}
                                    </span>
                                  </span>
                                  <RevokeInvitationButton
                                    invitationId={invitation.id}
                                  />
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}

                        <p className="pf-sub">Invite someone</p>
                        <InvitationForm engagementId={engagement.id} />

                        {detail && detail.trail.length > 0 ? (
                          <>
                            <p className="pf-sub">Recent access changes</p>
                            <ul className="pf-rows">
                              {detail.trail.map((event, index) => (
                                <li key={index}>
                                  <span className="pf-grow pf-quiet">
                                    {trailLine(event)}
                                  </span>
                                  <span className="pf-quiet">
                                    {shortDate(event.at)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    </details>
                  );
                })}
            </div>
          ))}
        </section>

        <section className="pf-section" aria-label="New client">
          <div className="pf-section-head">
            <h2 className="pf-section-title">New client</h2>
          </div>
          <OrganizationForm />
        </section>

        <section className="pf-section" aria-label="New engagement">
          <div className="pf-section-head">
            <h2 className="pf-section-title">New engagement</h2>
            <span className="pf-note">Under an existing client</span>
          </div>
          <EngagementForm
            organizations={(organizations ?? []).map((organization) => ({
              id: organization.id,
              name: organization.name,
            }))}
          />
        </section>

        <section className="pf-section" aria-label="Platform staff">
          <div className="pf-section-head">
            <h2 className="pf-section-title">Platform staff</h2>
            <span className="pf-note">
              The only grant that crosses clients. Extend it rarely.
            </span>
          </div>
          <StaffForm />
        </section>
      </div>
    </div>
  );
}
