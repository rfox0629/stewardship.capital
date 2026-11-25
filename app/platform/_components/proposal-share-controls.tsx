"use client";

import { useRef, useState, useTransition } from "react";

import type { ShareRow } from "@lib/platform/proposal-shares";
import { createProposalShare, revokeProposalShare, type ShareOutcome } from "../actions";

/**
 * Issuing and ending share links for a proposal. Staff only, on the client's
 * page. The server action re-checks the grant; this carries what was typed
 * and shows the link exactly once.
 */

const shortDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

export function ProposalShareControls({
  organizationId,
  organizationSlug,
  proposalSlug,
  origin,
  shares,
}: {
  organizationId: string;
  organizationSlug: string;
  proposalSlug: string;
  /** The origin the link is published on: the presenter's own domain. */
  origin: string;
  shares: ShareRow[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<Extract<ShareOutcome, { ok: true }> | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  /* Already narrowed to live shares by the page, which knows the time. */
  const live = shares;

  return (
    <>
      <p className="pf-sub">Active share links</p>
      {live.length === 0 ? (
        <p className="pf-quiet">None yet. Issue one below and send it to the person it names.</p>
      ) : (
        <ul className="pf-rows">
          {live.map((share) => (
            <li key={share.id}>
              <span className="pf-grow">
                {share.label}
                <span className="pf-quiet">
                  {" "}
                  until {shortDate(share.expires_at)}
                  {share.opened_count > 0
                    ? ` · opened ${share.opened_count} time${share.opened_count === 1 ? "" : "s"}, last ${shortDate(share.last_opened_at)}`
                    : " · not opened yet"}
                </span>
              </span>
              <button
                type="button"
                className="pf-text-action"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const outcome = await revokeProposalShare(share.id);
                    setMessage(outcome.ok ? null : (outcome.message ?? "Refused."));
                  })
                }
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="pf-sub">Share with someone</p>
      <form
        ref={ref}
        className="pf-form"
        action={(formData) =>
          startTransition(async () => {
            formData.set("organizationId", organizationId);
            formData.set("organizationSlug", organizationSlug);
            formData.set("proposalSlug", proposalSlug);
            const outcome = await createProposalShare(formData);
            if (outcome.ok) {
              setIssued(outcome);
              setCopied(false);
              setMessage(null);
              ref.current?.reset();
            } else {
              setMessage(outcome.message ?? "Refused.");
            }
          })
        }
      >
        <div className="pf-grid pf-grid-2">
          <div className="pf-field">
            <label htmlFor={`share-label-${proposalSlug}`}>For</label>
            <input
              id={`share-label-${proposalSlug}`}
              name="label"
              required
              maxLength={120}
              placeholder="Mike Anderson"
            />
          </div>
          <div className="pf-field">
            <label htmlFor={`share-days-${proposalSlug}`}>Valid for</label>
            <select id={`share-days-${proposalSlug}`} name="days" defaultValue="30">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>
        <button className="pf-submit" type="submit" disabled={pending}>
          {pending ? "Issuing" : "Issue share link"}
        </button>
        {message ? <p className="pf-message" role="status">{message}</p> : null}
      </form>

      {issued ? (
        <div className="pf-link-once" role="status">
          <span className="pf-quiet">
            The link for {issued.label}, valid until {issued.expires}. It is shown once
            and only its hash is stored: copy it now.
          </span>
          <code>{`${origin}${issued.link}`}</code>
          <span style={{ display: "flex", gap: 18 }}>
            <button
              type="button"
              className="pf-text-action"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${origin}${issued.link}`);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="pf-text-action" onClick={() => setIssued(null)}>
              Done
            </button>
          </span>
        </div>
      ) : null}
    </>
  );
}
