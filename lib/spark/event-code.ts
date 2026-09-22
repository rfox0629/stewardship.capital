import { createHash, randomUUID } from "node:crypto";

/**
 * The weekend's own credential.
 *
 * A code that opens one engagement's team guide, held in a cookie the page
 * cannot read, scoped to the address the guide lives at, and expiring when
 * the weekend does. It is not a Spark session and cannot become one: what it
 * permits is defined in the database, by two functions that read the team
 * guide and tick a duty off.
 *
 * The code itself never leaves the server. The browser posts it once, this
 * hashes it, and the database compares hashes.
 */

export const EVENT_COOKIE = "shine_team";

/** The guide's own path, so the cookie is not sent anywhere else on the site. */
export const EVENT_COOKIE_PATH = "/shine/2026";

/**
 * Sunday is the fourth; the session ends at the close of the fifth, Central
 * time, which is 05:00 UTC on the sixth.
 */
export const EVENT_EXPIRES = new Date("2026-10-06T05:00:00Z");

export const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

/** What the person typed, tidied: phones like to add spaces and lower case. */
export const normaliseCode = (value: string): string =>
  value.replace(/\s+/g, "").toUpperCase().slice(0, 64);

/**
 * Who is guessing, without keeping who they are.
 *
 * Rate limiting needs to tell callers apart and nothing more, so the address
 * is hashed with the day and never stored in the clear.
 */
export const callerHash = (address: string | null, agent: string | null): string =>
  sha256(`${address ?? "unknown"}|${agent ?? ""}|${new Date().toISOString().slice(0, 10)}`);

export const newSessionToken = (): string => randomUUID().replace(/-/g, "");

/**
 * Where to go after the code is accepted.
 *
 * Only inside this guide: an open redirect is a small hole that turns a
 * shared code into a way of pointing people somewhere else entirely.
 */
export const safeNext = (next: string | null | undefined): string => {
  if (!next || !next.startsWith(`${EVENT_COOKIE_PATH}/`)) return `${EVENT_COOKIE_PATH}/team`;
  if (next.includes("//") || next.includes("\\")) return `${EVENT_COOKIE_PATH}/team`;
  return next;
};
