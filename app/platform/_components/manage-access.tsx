import {
  InvitationForm,
  MemberControls,
  RevokeInvitationButton,
} from "../platform-controls";

/**
 * Who can reach one engagement, and the door for the next person in.
 *
 * The same block that used to sit open under every engagement on the
 * platform home, now behind a project's Manage access. The controls are the
 * platform's own and re-check the staff grant on each call; this only lays
 * them out.
 */

export type RosterRow = { user_id: string; email: string; role: string; since: string };

export type TrailRow = {
  at: string;
  action: string;
  subject_email: string | null;
  actor_email: string | null;
  from_role: string | null;
  to_role: string | null;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  engagement_id: string;
};

export const shortDate = (value: string | null) =>
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

/** The invitations still open for an engagement: unaccepted, unrevoked, unexpired. */
export const pendingInvitations = (invitations: InvitationRow[], engagementId: string) =>
  invitations.filter(
    (invitation) =>
      invitation.engagement_id === engagementId &&
      !invitation.accepted_at &&
      !invitation.revoked_at &&
      new Date(invitation.expires_at).getTime() > Date.now(),
  );

export function ManageAccess({
  engagementId,
  roster,
  pending,
  trail,
}: {
  engagementId: string;
  roster: RosterRow[];
  pending: InvitationRow[];
  trail: TrailRow[];
}) {
  return (
    <>
      <p className="pf-sub">Members</p>
      {roster.length > 0 ? (
        <ul className="pf-rows">
          {roster.map((member) => (
            <li key={member.user_id}>
              <span className="pf-grow">{member.email}</span>
              <MemberControls
                engagementId={engagementId}
                userId={member.user_id}
                role={member.role}
                email={member.email}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="pf-quiet">Nobody yet. The first invitation below changes that.</p>
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
                    as {invitation.role}, until {shortDate(invitation.expires_at)}
                  </span>
                </span>
                <RevokeInvitationButton invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="pf-sub">Invite someone</p>
      <InvitationForm engagementId={engagementId} />

      {trail.length > 0 ? (
        <>
          <p className="pf-sub">Recent access changes</p>
          <ul className="pf-rows">
            {trail.map((event, index) => (
              <li key={index}>
                <span className="pf-grow pf-quiet">{trailLine(event)}</span>
                <span className="pf-quiet">{shortDate(event.at)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
