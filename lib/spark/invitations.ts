import { randomToken, seal, unseal } from "./crypto.ts";
import type { SparkRole } from "./types.ts";

/**
 * Invitations.
 *
 * A token is a signed set of claims rather than a row identifier, so it cannot
 * be guessed or enumerated: forging one requires the signing secret, and the
 * random jti makes two invitations to the same address distinct.
 *
 * The token is never the session. It only starts the identity flow. The person
 * still has to prove they read the address it was issued to, and the session
 * they end up with is an ordinary Spark session.
 */

export type InvitationClaims = {
  /** Unique id, used to burn the invitation once accepted. */
  jti: string;
  email: string;
  workspaceId: string;
  role: SparkRole;
  exp: number;
};

export const INVITATION_TTL_SECONDS = 14 * 24 * 60 * 60;

const now = () => Math.floor(Date.now() / 1000);

export const mintInvitation = async (
  input: {
    email: string;
    workspaceId: string;
    role: SparkRole;
    ttlSeconds?: number;
  },
  secret: string,
): Promise<{ token: string; claims: InvitationClaims }> => {
  const claims: InvitationClaims = {
    jti: randomToken(18),
    email: input.email.trim().toLowerCase(),
    workspaceId: input.workspaceId,
    role: input.role,
    exp: now() + (input.ttlSeconds ?? INVITATION_TTL_SECONDS),
  };

  return { token: await seal(claims, secret, "invitation"), claims };
};

export const readInvitation = async (
  token: string | undefined,
  secret: string,
): Promise<InvitationClaims | null> => {
  const claims = await unseal<InvitationClaims>(token, secret, "invitation");
  if (!claims) return null;
  if (
    typeof claims.jti !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.workspaceId !== "string" ||
    typeof claims.role !== "string"
  ) {
    return null;
  }
  if (typeof claims.exp !== "number" || claims.exp < now()) return null;
  return claims;
};

/**
 * Records which invitations have already been accepted.
 *
 * In memory here, which is enough to make acceptance single use within a
 * process and is what the tests exercise. A deployed Spark needs this to be a
 * table, because serverless instances do not share memory.
 */
export interface ConsumedInvitations {
  has(jti: string): Promise<boolean>;
  add(jti: string, exp: number): Promise<void>;
}

export const memoryConsumedInvitations = (): ConsumedInvitations => {
  const burned = new Map<string, number>();

  return {
    async has(jti) {
      const exp = burned.get(jti);
      if (exp === undefined) return false;
      if (exp < now()) {
        burned.delete(jti);
        return false;
      }
      return true;
    },
    async add(jti, exp) {
      burned.set(jti, exp);
    },
  };
};

export type AcceptOutcome =
  | { ok: true; claims: InvitationClaims }
  | { ok: false; reason: "invalid" | "already-used" };

/** Burns the invitation. A second acceptance of the same token is refused. */
export const acceptInvitation = async (
  claims: InvitationClaims,
  store: ConsumedInvitations,
): Promise<AcceptOutcome> => {
  if (await store.has(claims.jti)) {
    return { ok: false, reason: "already-used" };
  }
  await store.add(claims.jti, claims.exp);
  return { ok: true, claims };
};
