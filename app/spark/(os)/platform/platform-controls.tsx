"use client";

import { useRef, useState, useTransition } from "react";

import {
  createEngagement,
  createInvitation,
  createOrganization,
  grantStaff,
  removeMember,
  revokeInvitation,
  setMemberRole,
  type InvitationOutcome,
} from "./actions";

/**
 * The interactive half of the staff surface. Nothing here decides anything:
 * every control calls a server action that re-checks the staff grant on its
 * own request, and these components only carry what the person typed and
 * show what came back.
 */

const ROLES = ["planner", "client", "stakeholder"] as const;

function useOutcome() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return { message, setMessage, pending, startTransition };
}

export function OrganizationForm() {
  const { message, setMessage, pending, startTransition } = useOutcome();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className="pf-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await createOrganization(formData);
          setMessage(outcome.ok ? "Created." : (outcome.message ?? "Refused."));
          if (outcome.ok) ref.current?.reset();
        })
      }
    >
      <div className="pf-grid pf-grid-2">
        <div className="pf-field">
          <label htmlFor="org-name">Client name</label>
          <input id="org-name" name="name" required maxLength={120} placeholder="SHINE" />
        </div>
        <div className="pf-field">
          <label htmlFor="org-slug">Slug</label>
          <input
            id="org-slug"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,62}"
            placeholder="shine"
          />
        </div>
      </div>
      <button className="pf-submit" type="submit" disabled={pending}>
        {pending ? "Creating" : "Create client"}
      </button>
      {message ? <p className="pf-message" role="status">{message}</p> : null}
    </form>
  );
}

export function EngagementForm({
  organizations,
}: {
  organizations: Array<{ id: string; name: string }>;
}) {
  const { message, setMessage, pending, startTransition } = useOutcome();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className="pf-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await createEngagement(formData);
          setMessage(outcome.ok ? "Created." : (outcome.message ?? "Refused."));
          if (outcome.ok) ref.current?.reset();
        })
      }
    >
      <div className="pf-grid pf-grid-2">
        <div className="pf-field">
          <label htmlFor="eng-org">Client</label>
          <select id="eng-org" name="organizationId" required>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pf-field">
          <label htmlFor="eng-name">Engagement name</label>
          <input
            id="eng-name"
            name="name"
            required
            maxLength={120}
            placeholder="Founders Weekend 2027"
          />
        </div>
      </div>
      <div className="pf-grid pf-grid-2">
        <div className="pf-field">
          <label htmlFor="eng-series">Series slug</label>
          <input
            id="eng-series"
            name="seriesSlug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,62}"
            placeholder="founders-weekend"
          />
        </div>
        <div className="pf-field">
          <label htmlFor="eng-edition">Edition</label>
          <input
            id="eng-edition"
            name="editionLabel"
            required
            pattern="[a-z0-9][a-z0-9-]{1,62}"
            placeholder="2027"
          />
        </div>
      </div>
      <div className="pf-grid pf-grid-3">
        <div className="pf-field">
          <label htmlFor="eng-location">Location</label>
          <input id="eng-location" name="location" maxLength={120} placeholder="Spooner, Wisconsin" />
        </div>
        <div className="pf-field">
          <label htmlFor="eng-starts">Starts</label>
          <input id="eng-starts" name="startsOn" type="date" />
        </div>
        <div className="pf-field">
          <label htmlFor="eng-ends">Ends</label>
          <input id="eng-ends" name="endsOn" type="date" />
        </div>
      </div>
      <button className="pf-submit" type="submit" disabled={pending}>
        {pending ? "Creating" : "Create engagement"}
      </button>
      {message ? <p className="pf-message" role="status">{message}</p> : null}
    </form>
  );
}

export function MemberControls({
  engagementId,
  userId,
  role,
  email,
}: {
  engagementId: string;
  userId: string;
  role: string;
  email: string;
}) {
  const { message, setMessage, pending, startTransition } = useOutcome();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <select
        className="pf-inline-select"
        value={role}
        disabled={pending}
        aria-label={`Role for ${email}`}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            const outcome = await setMemberRole(engagementId, userId, next);
            setMessage(outcome.ok ? null : (outcome.message ?? "Refused."));
          });
        }}
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {confirming ? (
        <>
          <button
            type="button"
            className="pf-text-action"
            style={{ color: "var(--sp-signal, #ff4d00)" }}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const outcome = await removeMember(engagementId, userId);
                setMessage(outcome.ok ? null : (outcome.message ?? "Refused."));
                setConfirming(false);
              })
            }
          >
            Remove {email}?
          </button>
          <button
            type="button"
            className="pf-text-action"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          className="pf-text-action"
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          Remove
        </button>
      )}
      {message ? <span className="pf-message" role="status">{message}</span> : null}
    </>
  );
}

export function InvitationForm({ engagementId }: { engagementId: string }) {
  const { message, setMessage, pending, startTransition } = useOutcome();
  const [issued, setIssued] = useState<Extract<InvitationOutcome, { ok: true }> | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <>
      <form
        ref={ref}
        className="pf-form"
        action={(formData) =>
          startTransition(async () => {
            formData.set("engagementId", engagementId);
            const outcome = await createInvitation(formData);
            if (outcome.ok) {
              setIssued(outcome);
              setMessage(null);
              ref.current?.reset();
            } else {
              setMessage(outcome.message ?? "Refused.");
            }
          })
        }
      >
        <div className="pf-grid pf-grid-3">
          <div className="pf-field">
            <label htmlFor={`inv-email-${engagementId}`}>Email</label>
            <input
              id={`inv-email-${engagementId}`}
              name="email"
              type="email"
              required
              placeholder="brooke@shineintheworld.org"
            />
          </div>
          <div className="pf-field">
            <label htmlFor={`inv-role-${engagementId}`}>Role</label>
            <select id={`inv-role-${engagementId}`} name="role" defaultValue="client">
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="pf-field">
            <label htmlFor={`inv-days-${engagementId}`}>Valid for</label>
            <select id={`inv-days-${engagementId}`} name="days" defaultValue="14">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        </div>
        <button className="pf-submit" type="submit" disabled={pending}>
          {pending ? "Creating" : "Create invitation"}
        </button>
        {message ? <p className="pf-message" role="status">{message}</p> : null}
      </form>

      {issued ? (
        <div className="pf-link-once" role="status">
          <span className="pf-quiet">
            The invitation for {issued.email}, valid until {issued.expires}. This
            link is shown once and only its hash is stored: copy it now.
          </span>
          <code>{`https://stewardship.capital${issued.link}`}</code>
          <button
            type="button"
            className="pf-text-action"
            onClick={() => setIssued(null)}
          >
            I have copied it
          </button>
        </div>
      ) : null}
    </>
  );
}

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const { pending, startTransition } = useOutcome();

  return (
    <button
      type="button"
      className="pf-text-action"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revokeInvitation(invitationId);
        })
      }
    >
      Revoke
    </button>
  );
}

export function StaffForm() {
  const { message, setMessage, pending, startTransition } = useOutcome();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className="pf-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await grantStaff(formData);
          setMessage(outcome.ok ? "Granted." : (outcome.message ?? "Refused."));
          if (outcome.ok) ref.current?.reset();
        })
      }
    >
      <div className="pf-grid pf-grid-2">
        <div className="pf-field">
          <label htmlFor="staff-email">Email of an existing Spark identity</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            required
            placeholder="ryan@stewardship.capital"
          />
        </div>
      </div>
      <button className="pf-submit" type="submit" disabled={pending}>
        {pending ? "Granting" : "Grant platform staff"}
      </button>
      {message ? <p className="pf-message" role="status">{message}</p> : null}
    </form>
  );
}
