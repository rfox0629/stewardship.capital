import assert from "node:assert/strict";
import test from "node:test";

import { authorizeSparkPath } from "../lib/spark/authorize.ts";
import {
  SparkConfigError,
  isProductionRuntime,
  sessionSecret,
} from "../lib/spark/config.ts";
import { seal, unseal } from "../lib/spark/crypto.ts";
import {
  acceptInvitation,
  memoryConsumedInvitations,
  mintInvitation,
  readInvitation,
} from "../lib/spark/invitations.ts";
import {
  readSession,
  readVerified,
  sealSession,
  sealVerified,
} from "../lib/spark/session.ts";
import {
  MAX_ATTEMPTS,
  issueChallenge,
  readChallenge,
  sealChallenge,
  verifyChallenge,
} from "../lib/spark/verification.ts";

const SECRET = "test-secret-that-is-long-enough-to-be-accepted";
const OTHER_SECRET = "a-different-secret-also-long-enough-for-use";

const env = (values: Record<string, string>) =>
  values as unknown as NodeJS.ProcessEnv;

const SHINE = "shine-founders-weekend-2026";
const REDEEMER = "redeemer-leaders-retreat-2027";
const SHINE_HOME = `/events-os/c/shine/e/founders-weekend/2026`;
const REDEEMER_HOME = `/events-os/c/redeemer-collective/e/leaders-retreat/2027`;

/* ------------------------------------------------------- identity proof */

test("knowing an authorized address alone does not grant access", async () => {
  const { challenge } = await issueChallenge("megan@shine.co", SECRET);

  /* A challenge is only a posted code. It is not an identity, and it cannot
     be turned into one without the code. */
  const guessed = await verifyChallenge(challenge, "AAAAAAAA", SECRET);
  assert.equal(guessed.ok, false);

  /* And nothing about holding the address produces a usable session. */
  assert.deepEqual(authorizeSparkPath(SHINE_HOME, null), {
    allow: false,
    redirectTo: "/more",
  });
});

test("the correct code verifies, and yields the address the server issued it to", async () => {
  const { challenge, code } = await issueChallenge("megan@shine.co", SECRET);
  const outcome = await verifyChallenge(challenge, code, SECRET);

  assert.equal(outcome.ok, true);
  assert.equal(outcome.ok && outcome.email, "megan@shine.co");
});

test("codes are accepted in the form people actually type them", async () => {
  const { challenge, code } = await issueChallenge("megan@shine.co", SECRET);
  const typed = `${code.slice(0, 4).toLowerCase()} - ${code.slice(4).toLowerCase()}`;
  const outcome = await verifyChallenge(challenge, typed, SECRET);
  assert.equal(outcome.ok, true);
});

test("verification cannot authenticate as another address", async (t) => {
  await t.test("by editing the sealed challenge", async () => {
    const { challenge, code } = await issueChallenge("megan@shine.co", SECRET);
    const sealed = await sealChallenge(challenge, SECRET);

    const decoded = await unseal<typeof challenge>(sealed, SECRET, "challenge");
    assert.ok(decoded);
    const forged = await seal({ ...decoded, email: "attacker@evil.test" }, OTHER_SECRET, "challenge");

    /* Re-signed with a secret the attacker controls, so it is not a challenge
       this server ever issued. */
    assert.equal(await readChallenge(forged, SECRET), null);

    /* And the untouched challenge still resolves to its own address only. */
    const outcome = await verifyChallenge(decoded, code, SECRET);
    assert.equal(outcome.ok && outcome.email, "megan@shine.co");
  });

  await t.test("by replaying another address's code", async () => {
    const mine = await issueChallenge("attacker@evil.test", SECRET);
    const theirs = await issueChallenge("megan@shine.co", SECRET);

    /* The code is bound to the address and to a per challenge nonce, so a code
       from one challenge cannot satisfy another. */
    const outcome = await verifyChallenge(theirs.challenge, mine.code, SECRET);
    assert.equal(outcome.ok, false);
  });
});

test("an expired challenge is refused", async () => {
  const { challenge, code } = await issueChallenge("megan@shine.co", SECRET);
  const stale = { ...challenge, exp: Math.floor(Date.now() / 1000) - 1 };

  assert.equal(await readChallenge(await sealChallenge(stale, SECRET), SECRET), null);
  const outcome = await verifyChallenge(stale, code, SECRET);
  assert.equal(outcome.ok, false);
});

test("guessing is capped", async () => {
  const { challenge } = await issueChallenge("megan@shine.co", SECRET);
  const exhausted = { ...challenge, attempts: MAX_ATTEMPTS };

  const outcome = await verifyChallenge(exhausted, "AAAAAAAA", SECRET);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.reason, "exhausted");

  /* An exhausted challenge is also refused on the way in. */
  assert.equal(
    await readChallenge(await sealChallenge(exhausted, SECRET), SECRET),
    null,
  );
});

/* ---------------------------------------------------------- invitations */

test("invitation tokens are unguessable", async () => {
  const a = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
    SECRET,
  );
  const b = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
    SECRET,
  );

  /* Same inputs, different tokens, because the id is random. */
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.claims.jti, b.claims.jti);
  assert.ok(a.claims.jti.length >= 20);

  /* And a token cannot be produced without the signing secret. */
  const forged = await mintInvitation(
    { email: "attacker@evil.test", workspaceId: SHINE, role: "planner" },
    OTHER_SECRET,
  );
  assert.equal(await readInvitation(forged.token, SECRET), null);
});

test("invitations expire", async () => {
  const { token } = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client", ttlSeconds: -1 },
    SECRET,
  );
  assert.equal(await readInvitation(token, SECRET), null);
});

test("invitation acceptance is single use", async () => {
  const store = memoryConsumedInvitations();
  const { token } = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
    SECRET,
  );

  const claims = await readInvitation(token, SECRET);
  assert.ok(claims);

  const first = await acceptInvitation(claims, store);
  assert.equal(first.ok, true);

  const second = await acceptInvitation(claims, store);
  assert.equal(second.ok, false);
  assert.equal(second.ok === false && second.reason, "already-used");
});

test("an invitation cannot be edited to grant another workspace or role", async () => {
  const { token } = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
    SECRET,
  );

  const decoded = await unseal<Record<string, unknown>>(token, SECRET, "invitation");
  assert.ok(decoded);

  /* Re-signing with any other key fails, and the payload cannot be changed
     without re-signing. */
  const escalated = await seal(
    { ...decoded, workspaceId: REDEEMER, role: "planner" },
    OTHER_SECRET,
    "invitation",
  );
  assert.equal(await readInvitation(escalated, SECRET), null);

  /* The genuine token still names only what it was issued for. */
  const honest = await readInvitation(token, SECRET);
  assert.equal(honest?.workspaceId, SHINE);
  assert.equal(honest?.role, "client");
});

test("an invitation is not a session", async () => {
  const { token } = await mintInvitation(
    { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
    SECRET,
  );

  /* Presenting the invitation token as a session cookie gets nowhere: the
     shapes are different and the session reader rejects it. */
  assert.equal(await readSession(token, SECRET), null);
});

/* -------------------------------------------------------- authorization */

test("a workspace URL is closed without a session", () => {
  for (const path of [
    "/events-os",
    SHINE_HOME,
    `${SHINE_HOME}/budget`,
    `${SHINE_HOME}/sparks`,
  ]) {
    assert.deepEqual(authorizeSparkPath(path, null), {
      allow: false,
      redirectTo: "/more",
    });
  }
});

test("a client reaches their own workspace and nothing else", () => {
  const client = { email: "megan@shine.co", workspaceId: SHINE, role: "client" as const };

  assert.deepEqual(authorizeSparkPath(SHINE_HOME, client), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE_HOME}/budget`, client), { allow: true });

  /* Cross client isolation. */
  assert.deepEqual(authorizeSparkPath(REDEEMER_HOME, client), {
    allow: false,
    redirectTo: SHINE_HOME,
  });
  assert.deepEqual(authorizeSparkPath(`${REDEEMER_HOME}/budget`, client), {
    allow: false,
    redirectTo: SHINE_HOME,
  });
  assert.deepEqual(
    authorizeSparkPath("/events-os/c/redeemer-collective", client),
    { allow: false, redirectTo: SHINE_HOME },
  );
});

test("the planner home is planner only, because it lists every client", () => {
  const client = { email: "megan@shine.co", workspaceId: SHINE, role: "client" as const };
  const guest = {
    email: "guest@shine.co",
    workspaceId: SHINE,
    role: "stakeholder" as const,
  };
  const planner = {
    email: "ryan@stewardship.capital",
    workspaceId: SHINE,
    role: "planner" as const,
  };

  assert.deepEqual(authorizeSparkPath("/events-os", client), {
    allow: false,
    redirectTo: SHINE_HOME,
  });
  assert.deepEqual(authorizeSparkPath("/events-os", guest), {
    allow: false,
    redirectTo: SHINE_HOME,
  });
  assert.deepEqual(authorizeSparkPath("/events-os", planner), { allow: true });
});

test("a session naming a workspace that does not exist is refused", () => {
  const ghost = { email: "x@y.co", workspaceId: "no-such-workspace", role: "planner" as const };
  assert.deepEqual(authorizeSparkPath(SHINE_HOME, ghost), {
    allow: false,
    redirectTo: "/more",
  });
});

/* ------------------------------------------------------------- sessions */

test("a genuine session round trips", async () => {
  const token = await sealSession("megan@shine.co", SHINE, "client", SECRET);
  const session = await readSession(token, SECRET);

  assert.equal(session?.email, "megan@shine.co");
  assert.equal(session?.workspaceId, SHINE);
  assert.equal(session?.role, "client");
});

test("forged and malformed session cookies fail safely", async () => {
  const genuine = await sealSession("megan@shine.co", SHINE, "client", SECRET);

  const rejected = [
    undefined,
    "",
    "notevenclose",
    "....",
    "%%%.%%%",
    "eyJlIjoiaGFja2VyIn0.bogus",
    `${genuine}tampered`,
    genuine.replace(/.$/, "A"),
    await sealSession("attacker@evil.test", SHINE, "planner", OTHER_SECRET),
  ];

  for (const token of rejected) {
    assert.equal(await readSession(token, SECRET), null, `accepted: ${token}`);
  }
});

test("an expired session is refused", async () => {
  const expired = await seal(
    { email: "megan@shine.co", workspaceId: SHINE, role: "client", exp: 1 },
    SECRET,
    "session",
  );
  assert.equal(await readSession(expired, SECRET), null);
});

test("privilege cannot be raised by editing a session", async () => {
  const token = await sealSession("megan@shine.co", SHINE, "client", SECRET);
  const decoded = await unseal<Record<string, unknown>>(token, SECRET, "session");
  assert.ok(decoded);

  const escalated = await seal({ ...decoded, role: "planner" }, OTHER_SECRET, "session");
  assert.equal(await readSession(escalated, SECRET), null);
});

/* --------------------------------------------------------- configuration */

test("production without a session secret fails closed", () => {
  assert.throws(
    () => sessionSecret(env({ NODE_ENV: "production" })),
    SparkConfigError,
  );
  assert.throws(
    () => sessionSecret(env({ VERCEL_ENV: "production" })),
    SparkConfigError,
  );
});

test("a short secret is refused even in production", () => {
  assert.throws(
    () =>
      sessionSecret(env({
        NODE_ENV: "production",
        SPARK_SESSION_SECRET: "too-short",
      })),
    SparkConfigError,
  );
});

test("a configured production secret is accepted", () => {
  assert.equal(
    sessionSecret(env({
      NODE_ENV: "production",
      SPARK_SESSION_SECRET: SECRET,
    })),
    SECRET,
  );
});

test("a preview is not production, so local and preview stay workable", () => {
  assert.equal(
    isProductionRuntime(env({ NODE_ENV: "production", VERCEL_ENV: "preview" })),
    false,
  );
  assert.equal(
    isProductionRuntime(env({ NODE_ENV: "development" })),
    false,
  );
  assert.equal(
    isProductionRuntime(env({ NODE_ENV: "production" })),
    true,
  );
  assert.doesNotThrow(() =>
    sessionSecret(env({ NODE_ENV: "production", VERCEL_ENV: "preview" })),
  );
});

/* ------------------------------------------------- token confusion */

test("a token of one purpose never verifies as another", async () => {
  /* This is the regression test for a real bug. An invitation names an email,
     a workspace, a role and an expiry, which is byte for byte the shape of a
     session. Signed with one key it was a valid session cookie, so an
     invitation link could be pasted in and skip verification entirely.
     Each purpose now derives its own key. */
  const session = await sealSession("megan@shine.co", SHINE, "client", SECRET);
  const invitation = (
    await mintInvitation(
      { email: "sam@shine.co", workspaceId: SHINE, role: "client" },
      SECRET,
    )
  ).token;
  const challenge = await sealChallenge(
    (await issueChallenge("megan@shine.co", SECRET)).challenge,
    SECRET,
  );
  const verified = await sealVerified("megan@shine.co", SECRET);

  const readers = {
    session: (token: string) => readSession(token, SECRET),
    invitation: (token: string) => readInvitation(token, SECRET),
    challenge: (token: string) => readChallenge(token, SECRET),
    verified: (token: string) => readVerified(token, SECRET),
  };
  const tokens = { session, invitation, challenge, verified };

  for (const [issuedAs, token] of Object.entries(tokens)) {
    for (const [readAs, read] of Object.entries(readers)) {
      const result = await read(token);
      if (issuedAs === readAs) {
        assert.notEqual(result, null, `${issuedAs} should read as ${readAs}`);
      } else {
        assert.equal(result, null, `${issuedAs} was accepted as ${readAs}`);
      }
    }
  }
});

test("an unverified pending marker cannot stand in for a verified one", async () => {
  /* The workspace selector trusts this cookie for the identity, so a value
     that was never marked verified must not be readable as one. */
  const notVerified = await seal(
    { email: "attacker@evil.test", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
    "verified",
  );
  assert.equal(await readVerified(notVerified, SECRET), null);
});
