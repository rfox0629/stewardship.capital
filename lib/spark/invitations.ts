import { createAdminClient } from "../supabase/admin.ts";
import { hashInvitationToken, looksLikeInvitationToken } from "./tokens.ts";

/**
 * Reading an invitation, before anyone is signed in.
 *
 * This answers one question only: is there a live invitation behind this
 * token, and what address was it issued to. It does not grant anything, and
 * the caller cannot act on the answer without then proving they read that
 * address.
 *
 * Every failure is the same failure. Malformed, unknown, expired, revoked, and
 * already accepted all return null, so the route cannot be used to learn which
 * tokens once existed.
 */

export type LiveInvitation = {
  email: string;
  engagementId: string;
  tokenHash: string;
};

export const findLiveInvitation = async (
  token: string | undefined,
): Promise<LiveInvitation | null> => {
  if (!looksLikeInvitationToken(token)) return null;

  const tokenHash = await hashInvitationToken(token as string);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("invitations")
      .select("email, engagement_id, expires_at, accepted_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !data) return null;
    if (data.accepted_at || data.revoked_at) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) return null;

    return {
      email: String(data.email).toLowerCase(),
      engagementId: String(data.engagement_id),
      tokenHash,
    };
  } catch {
    /* A missing service role must not become a way in, and must not become a
       different looking failure either. */
    return null;
  }
};

export type AcceptResult = { ok: true; engagementId: string } | { ok: false };

/**
 * Accepts under the person's own session, never the service role.
 *
 * The database checks that the signed in address matches the invited one, that
 * the invitation is live, and that nobody has accepted it already, all in the
 * single statement that consumes it. Doing that here instead would be a check
 * followed by a write, which two simultaneous acceptances can both pass.
 */
export const acceptInvitation = async (
  supabase: {
    rpc: (
      name: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  tokenHash: string,
): Promise<AcceptResult> => {
  try {
    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token_hash: tokenHash,
    });

    if (error || !data || typeof data !== "object") return { ok: false };
    const result = data as Record<string, unknown>;
    if (result.ok !== true || typeof result.engagement_id !== "string") {
      return { ok: false };
    }

    return { ok: true, engagementId: result.engagement_id };
  } catch {
    return { ok: false };
  }
};
