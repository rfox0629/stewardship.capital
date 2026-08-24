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

/**
 * Makes sure the invited address has an account, so a code can be sent to it.
 *
 * This exists so that public signup can stay switched off at the project
 * level. With it off, the Auth API refuses to create accounts, which is what
 * invitation only should mean; the one legitimate exception is an address a
 * planner has already invited, and this is that exception, done deliberately
 * with the service role rather than by leaving the front door open to
 * everyone.
 *
 * Creating the account grants nothing. The person still has to prove they read
 * the address before any session exists, and still has to hold a membership
 * before any workspace does.
 */
export const ensureAccountExists = async (email: string): Promise<boolean> => {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    /* Already registered is the ordinary case: most invitations go to people
       who have been in Spark before. */
    if (error && !/already been registered|already exists/i.test(error.message)) {
      return false;
    }
    return true;
  } catch {
    return false;
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
