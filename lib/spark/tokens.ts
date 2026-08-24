/**
 * Invitation tokens.
 *
 * A token is 32 bytes of randomness and nothing else. It carries no claims, so
 * there is nothing in it to forge and no signing secret to leak: what the
 * invitation grants lives in the database row, and the row is found by the
 * hash of the token.
 *
 * Only the hash is ever stored. Reading the invitations table therefore cannot
 * produce a working link, which is what lets planners see who has been invited
 * without that view becoming a way in.
 *
 * Web Crypto so this works unchanged in the middleware runtime, a route
 * handler, and a script.
 */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** 32 bytes, url safe, no separators to lose when a link wraps in an email. */
export const randomInvitationToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
};

export const hashInvitationToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`spark.invitation.v1:${token}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/* A token that could not have come from randomInvitationToken is rejected
   before it reaches the database, so a malformed link costs nothing. */
const SHAPE = /^[0-9a-z]{32}$/;

export const looksLikeInvitationToken = (token: string | undefined): boolean =>
  typeof token === "string" && SHAPE.test(token);
