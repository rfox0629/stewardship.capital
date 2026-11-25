import { createAdminClient } from "../supabase/admin.ts";
import { looksLikeInvitationToken, randomInvitationToken } from "../spark/tokens.ts";

/**
 * Share links for a proposal.
 *
 * The same discipline as invitations: a token is randomness, the database
 * keeps its hash, and the link opens one proposal and nothing else. A share
 * is not an identity and grants no membership; it is the authorized way to
 * show a proposal to the person it was written for.
 *
 * The hash is domain separated from invitation hashes, so a proposal token
 * can never be mistaken for an invitation even if both tables were read
 * together.
 */

export const SHARE_PREFIX = "/p";

export const randomShareToken = randomInvitationToken;

export const looksLikeShareToken = looksLikeInvitationToken;

export const hashShareToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`tentmaiker.proposal.v1:${token}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const sharePath = (token: string) => `${SHARE_PREFIX}/${token}`;

/** A share as the platform lists it to staff. */
export type ShareRow = {
  id: string;
  label: string;
  expires_at: string;
  revoked_at: string | null;
  opened_count: number;
  last_opened_at: string | null;
};

/** The shares that still open something: unrevoked and unexpired. */
export const liveShares = <T extends Pick<ShareRow, "expires_at" | "revoked_at">>(
  rows: T[],
  now: number = Date.now(),
): T[] =>
  rows.filter((share) => !share.revoked_at && new Date(share.expires_at).getTime() > now);

export type LiveShare = {
  id: string;
  organizationId: string;
  proposalSlug: string;
  label: string;
};

/**
 * The live share behind a token, before anyone is signed in.
 *
 * Malformed, unknown, expired, and revoked all answer null, so the route
 * cannot be used to learn which tokens exist. Read under the service role
 * because the person following the link has no session, as with invitations.
 */
export const findLiveShare = async (token: string | undefined): Promise<LiveShare | null> => {
  if (!looksLikeShareToken(token)) return null;
  const tokenHash = await hashShareToken(token as string);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("proposal_shares")
      .select("id, organization_id, proposal_slug, label, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !data) return null;
    if (data.revoked_at) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) return null;

    return {
      id: String(data.id),
      organizationId: String(data.organization_id),
      proposalSlug: String(data.proposal_slug),
      label: String(data.label),
    };
  } catch {
    return null;
  }
};

/** Counts an opening. Best effort: a failure here never hides the proposal. */
export const recordShareOpened = async (share: LiveShare): Promise<void> => {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("proposal_shares")
      .select("opened_count")
      .eq("id", share.id)
      .maybeSingle();
    await admin
      .from("proposal_shares")
      .update({
        opened_count: (Number(data?.opened_count) || 0) + 1,
        last_opened_at: new Date().toISOString(),
      })
      .eq("id", share.id);
  } catch {
    /* Counting is a courtesy to staff, not a gate. */
  }
};
