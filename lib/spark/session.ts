import { seal, unseal } from "./crypto.ts";
import type { SparkRole, SparkSession } from "./types.ts";

/**
 * The workspace session.
 *
 * Issued only after an address has been verified. It carries the identity the
 * server established, never one the browser offered.
 */

export const SESSION_COOKIE = "spark_session";
export const CHALLENGE_COOKIE = "spark_challenge";
export const PENDING_COOKIE = "spark_pending";

/** Kept in step with the operating system's lens cookie, so a signed in
 *  person sees the workspace through the role they actually hold. */
export const VIEWER_COOKIE = "spark_viewer";

export const SESSION_MAX_AGE = 60 * 60 * 12;
export const CHALLENGE_MAX_AGE = 60 * 10;
export const PENDING_MAX_AGE = 60 * 10;

const now = () => Math.floor(Date.now() / 1000);

export const sealSession = (
  email: string,
  workspaceId: string,
  role: SparkRole,
  secret: string,
) =>
  seal(
    { email, workspaceId, role, exp: now() + SESSION_MAX_AGE } satisfies SparkSession,
    secret,
    "session",
  );

export const readSession = async (
  token: string | undefined,
  secret: string,
): Promise<SparkSession | null> => {
  const value = await unseal<SparkSession>(token, secret, "session");
  if (!value || typeof value.email !== "string") return null;
  if (typeof value.workspaceId !== "string" || typeof value.role !== "string") {
    return null;
  }
  if (typeof value.exp !== "number" || value.exp < now()) return null;
  return value;
};

/**
 * Carries a verified address between verification and the workspace choice,
 * so the selector never has to trust an identity supplied by the browser.
 */
export const sealVerified = (email: string, secret: string) =>
  seal({ email, verified: true, exp: now() + PENDING_MAX_AGE }, secret, "verified");

export const readVerified = async (
  token: string | undefined,
  secret: string,
): Promise<string | null> => {
  const value = await unseal<{ email?: string; verified?: boolean; exp?: number }>(
    token,
    secret,
    "verified",
  );
  if (!value || value.verified !== true || typeof value.email !== "string") {
    return null;
  }
  if (typeof value.exp !== "number" || value.exp < now()) return null;
  return value.email;
};
