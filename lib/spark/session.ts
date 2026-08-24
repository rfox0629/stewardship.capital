import type { SparkRole, SparkSession } from "./types";

/**
 * Session signing.
 *
 * Web Crypto rather than node:crypto, so the same code verifies a session in
 * a server action and in the route guard, which runs on the edge.
 *
 * SPARK_SESSION_SECRET must be set for this to be worth anything. The
 * development fallback below is not a secret and is treated as one only so the
 * preview runs; `sessionSecretConfigured` reports the difference honestly
 * rather than hiding it.
 */
const DEV_SECRET = "spark-development-secret-not-for-production";

export const SESSION_COOKIE = "spark_session";
export const PENDING_COOKIE = "spark_pending";

/** Kept in step with the operating system's lens cookie, so a signed in
 *  person sees the workspace through the role they actually hold. */
export const VIEWER_COOKIE = "spark_viewer";

export const sessionSecretConfigured = () =>
  Boolean(process.env.SPARK_SESSION_SECRET);

const secret = () => process.env.SPARK_SESSION_SECRET ?? DEV_SECRET;

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const importKey = async () =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const signPayload = async (payload: string) => {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(),
    encoder.encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
};

const seal = async (value: unknown) => {
  const payload = toBase64Url(encoder.encode(JSON.stringify(value)));
  return `${payload}.${await signPayload(payload)}`;
};

const unseal = async (token: string | undefined): Promise<unknown | null> => {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  /* A tampered cookie is malformed input, not an exception. Anything that
     throws in here, bad base64 included, is simply not a valid session. */
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;

    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    return null;
  }
};

const SESSION_TTL = 60 * 60 * 12;
const PENDING_TTL = 60 * 10;

export const sealSession = (
  email: string,
  workspaceId: string,
  role: SparkRole,
) =>
  seal({
    email,
    workspaceId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  });

export const readSession = async (
  token: string | undefined,
): Promise<SparkSession | null> => {
  const value = (await unseal(token)) as SparkSession | null;
  if (!value || typeof value.email !== "string") return null;
  if (typeof value.exp !== "number" || value.exp < Date.now() / 1000) return null;
  return value;
};

/** Holds the address between the email step and the workspace choice, so the
 *  second step never has to trust an identity supplied by the browser. */
export const sealPending = (email: string) =>
  seal({ email, exp: Math.floor(Date.now() / 1000) + PENDING_TTL });

export const readPending = async (
  token: string | undefined,
): Promise<string | null> => {
  const value = (await unseal(token)) as { email?: string; exp?: number } | null;
  if (!value || typeof value.email !== "string") return null;
  if (typeof value.exp !== "number" || value.exp < Date.now() / 1000) return null;
  return value.email;
};

export const SESSION_MAX_AGE = SESSION_TTL;
export const PENDING_MAX_AGE = PENDING_TTL;
