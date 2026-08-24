import { equals, hmac, normaliseCode, randomCode, randomToken, seal, unseal } from "./crypto.ts";
import type { SparkRole } from "./types.ts";

/**
 * Passwordless identity verification.
 *
 * The point of this module: knowing an authorized address must not grant
 * access. A challenge is issued by the server and held in a signed cookie, the
 * code is delivered out of band to that address, and the verified identity
 * comes from the signed challenge rather than from anything the browser sends.
 *
 * The code itself is never stored, only an HMAC of it bound to the address and
 * a per challenge nonce, so a leaked challenge cookie does not reveal the code
 * and a code from one challenge cannot satisfy another.
 */

export type PendingInvitation = {
  jti: string;
  workspaceId: string;
  role: SparkRole;
};

export type Challenge = {
  /** The address the code was sent to. The only identity the flow trusts. */
  email: string;
  codeHash: string;
  nonce: string;
  exp: number;
  attempts: number;
  /** Present when this challenge came from an invitation link. */
  invitation?: PendingInvitation;
};

export const CHALLENGE_TTL_SECONDS = 10 * 60;
export const MAX_ATTEMPTS = 6;

const now = () => Math.floor(Date.now() / 1000);

const codeFingerprint = (email: string, code: string, nonce: string, secret: string) =>
  hmac(`spark.code.v1:${email.toLowerCase()}:${nonce}:${code}`, secret, "challenge");

export type IssuedChallenge = {
  challenge: Challenge;
  /** Delivered by email. Never returned to the browser. */
  code: string;
};

export const issueChallenge = async (
  email: string,
  secret: string,
  invitation?: PendingInvitation,
): Promise<IssuedChallenge> => {
  const code = randomCode();
  const nonce = randomToken(12);

  return {
    code,
    challenge: {
      email: email.trim().toLowerCase(),
      nonce,
      codeHash: await codeFingerprint(email, code, nonce, secret),
      exp: now() + CHALLENGE_TTL_SECONDS,
      attempts: 0,
      ...(invitation ? { invitation } : {}),
    },
  };
};

export const sealChallenge = (challenge: Challenge, secret: string) =>
  seal(challenge, secret, "challenge");

export const readChallenge = async (
  token: string | undefined,
  secret: string,
): Promise<Challenge | null> => {
  const challenge = await unseal<Challenge>(token, secret, "challenge");
  if (!challenge) return null;
  if (typeof challenge.email !== "string" || typeof challenge.codeHash !== "string") {
    return null;
  }
  if (typeof challenge.exp !== "number" || challenge.exp < now()) return null;
  if (typeof challenge.attempts !== "number" || challenge.attempts >= MAX_ATTEMPTS) {
    return null;
  }
  return challenge;
};

export type VerificationOutcome =
  | { ok: true; email: string; invitation?: PendingInvitation }
  | { ok: false; reason: "expired" | "exhausted" | "mismatch"; challenge?: Challenge };

/**
 * The whole security property of the sign in flow lives here. The address is
 * taken from the signed challenge; the submitted code is only ever a proof
 * that the person reading that address is the one asking.
 */
export const verifyChallenge = async (
  challenge: Challenge | null,
  submitted: string,
  secret: string,
): Promise<VerificationOutcome> => {
  if (!challenge) return { ok: false, reason: "expired" };
  if (challenge.exp < now()) return { ok: false, reason: "expired" };
  if (challenge.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "exhausted" };

  const candidate = normaliseCode(submitted);
  const fingerprint = await codeFingerprint(
    challenge.email,
    candidate,
    challenge.nonce,
    secret,
  );

  if (!equals(fingerprint, challenge.codeHash)) {
    return {
      ok: false,
      reason: "mismatch",
      challenge: { ...challenge, attempts: challenge.attempts + 1 },
    };
  }

  return {
    ok: true,
    email: challenge.email,
    ...(challenge.invitation ? { invitation: challenge.invitation } : {}),
  };
};
