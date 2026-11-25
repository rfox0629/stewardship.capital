import assert from "node:assert/strict";
import test from "node:test";

import { sessionCookieExpiry } from "../lib/spark/event-code.ts";

/* The team cookie lapses with the session the database minted, never on a
   date written into the code. */

const NOW = Date.parse("2026-11-25T12:00:00Z");
const WEEK = 7 * 24 * 60 * 60 * 1000;

test("the cookie ends when the database says the weekend's window ends", () => {
  const end = "2027-10-05T05:00:00.000Z";
  assert.equal(sessionCookieExpiry(end, NOW).toISOString(), end);
});

test("a missing, malformed, or already past window falls back to a week", () => {
  for (const value of [null, undefined, 42, "not a date", "2026-10-06T05:00:00Z"]) {
    assert.equal(sessionCookieExpiry(value, NOW).getTime(), NOW + WEEK, String(value));
  }
});
