/**
 * Signing and random values.
 *
 * Web Crypto throughout, so the identical code runs in a server action, in a
 * route handler, and in the edge guard.
 */

const encoder = new TextEncoder();

export const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

/**
 * What a signed value is for.
 *
 * Every kind of token gets its own derived key, so a token of one purpose can
 * never verify as another even when the payloads happen to have the same
 * shape. Without this an invitation, which names an email, a workspace, a role
 * and an expiry, is byte for byte a valid session.
 */
export type Purpose = "session" | "challenge" | "invitation" | "verified";

const importKey = (secret: string, purpose: Purpose) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(`spark.v1.${purpose}\u0000${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export const hmac = async (
  input: string,
  secret: string,
  purpose: Purpose = "challenge",
) => {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret, purpose),
    encoder.encode(input),
  );
  return toBase64Url(new Uint8Array(signature));
};

/** Signs a JSON payload. The result is opaque and tamper evident. */
export const seal = async (
  value: unknown,
  secret: string,
  purpose: Purpose,
) => {
  const payload = toBase64Url(encoder.encode(JSON.stringify(value)));
  return `${payload}.${await hmac(payload, secret, purpose)}`;
};

/**
 * Verifies and parses. Anything malformed is absent input, not an exception:
 * a tampered cookie must never be able to crash a request.
 */
export const unseal = async <T>(
  token: string | undefined | null,
  secret: string,
  purpose: Purpose,
): Promise<T | null> => {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!payload || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret, purpose),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;

    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as T;
  } catch {
    return null;
  }
};

/** Constant time comparison, so a code cannot be recovered by timing. */
export const equals = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};

export const randomToken = (bytes = 32) =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

/* Crockford base32: no I, L, O, or U, so a code cannot be mistyped into a
   different valid code. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Eight characters, about 40 bits. Short enough to type, long enough that
 *  guessing it inside the challenge window is not a strategy. */
export const randomCode = (length = 8) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return code;
};

/** Accepts what people actually type: lower case, spaces, dashes. */
export const normaliseCode = (input: string) =>
  input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/O/g, "0")
    .replace(/U/g, "V");
