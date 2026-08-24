import assert from "node:assert/strict";
import test from "node:test";

import { authorizeSparkPath, landingFor } from "../lib/spark/authorize.ts";
import {
  SPARK_BASE,
  SPARK_PLATFORM,
  clientSlugOf,
  isOpenSparkPath,
  isSparkPath,
  pathBelongsToWorkspace,
} from "../lib/spark/paths.ts";
import { readAccess } from "../lib/spark/access.ts";
import {
  hashInvitationToken,
  looksLikeInvitationToken,
  randomInvitationToken,
} from "../lib/spark/tokens.ts";
import type { SparkAccess, SparkRole } from "../lib/spark/types.ts";

/**
 * Request level authorization, on its own.
 *
 * These exercise the real decision function the proxy calls, not a copy of it,
 * so a rule that is wrong here is wrong in production. What they deliberately
 * do not test is whether the access handed in is genuine: that is the
 * database's job, and the end to end suite is where it gets checked.
 */

const SHINE = "/spark/c/shine/e/founders-weekend/2026";
const REDEEMER = "/spark/c/redeemer-collective/e/leaders-retreat/2027";

const workspace = (clientSlug: string, eventSlug: string, editionSlug: string, role: SparkRole) => ({
  engagementId: `${clientSlug}-${eventSlug}-${editionSlug}`,
  role,
  clientSlug,
  clientName: clientSlug,
  eventSlug,
  editionSlug,
  engagementName: editionSlug,
});

const access = (
  workspaces: SparkAccess["workspaces"],
  staff = false,
): SparkAccess => ({
  userId: "00000000-0000-0000-0000-000000000001",
  email: "person@example.com",
  staff,
  workspaces,
});

const shineClient = access([
  workspace("shine", "founders-weekend", "2026", "client"),
]);
const shineGuest = access([
  workspace("shine", "founders-weekend", "2026", "stakeholder"),
]);
const shinePlanner = access([
  workspace("shine", "founders-weekend", "2026", "planner"),
]);
const staff = access(
  [
    workspace("shine", "founders-weekend", "2026", "planner"),
    workspace("redeemer-collective", "leaders-retreat", "2027", "planner"),
  ],
  true,
);
const stranger = access([]);

const REFUSED = { allow: false as const, redirectTo: SPARK_BASE };

/* ------------------------------------------------------------ path shapes */

test("Spark's namespace is recognised, and nothing outside it is", () => {
  assert.equal(isSparkPath("/spark"), true);
  assert.equal(isSparkPath(SHINE), true);
  assert.equal(isSparkPath("/sparkling"), false);
  assert.equal(isSparkPath("/"), false);
  assert.equal(isSparkPath("/dashboard"), false);
});

test("only the doors are open without a session", () => {
  assert.equal(isOpenSparkPath("/spark"), true);
  assert.equal(isOpenSparkPath("/spark/"), true);
  assert.equal(isOpenSparkPath("/spark/i/abc"), true);
  assert.equal(isOpenSparkPath("/spark/auth/callback"), true);
  assert.equal(isOpenSparkPath("/spark/signout"), true);

  assert.equal(isOpenSparkPath(SHINE), false);
  assert.equal(isOpenSparkPath(SPARK_PLATFORM), false);
  /* A path that merely begins with an open one is not an open one. */
  assert.equal(isOpenSparkPath("/spark/invitations"), false);
  assert.equal(isOpenSparkPath("/spark/authority"), false);
});

test("the client segment is read from the path, not guessed", () => {
  assert.equal(clientSlugOf(SHINE), "shine");
  assert.equal(clientSlugOf("/spark/c/shine"), "shine");
  assert.equal(clientSlugOf(SPARK_PLATFORM), null);
  assert.equal(clientSlugOf("/spark"), null);
});

test("workspace containment does not match a neighbouring slug", () => {
  const shine = workspace("shine", "founders-weekend", "2026", "client");
  assert.equal(pathBelongsToWorkspace(SHINE, shine), true);
  assert.equal(pathBelongsToWorkspace(`${SHINE}/budget`, shine), true);
  assert.equal(pathBelongsToWorkspace(`${SHINE}x`, shine), false);
  assert.equal(pathBelongsToWorkspace(REDEEMER, shine), false);
  assert.equal(
    pathBelongsToWorkspace("/spark/c/shine/e/founders-weekend/2027", shine),
    false,
  );
});

/* ------------------------------------------------------------- refusals */

test("no access reaches no workspace", () => {
  for (const path of [SHINE, REDEEMER, SPARK_PLATFORM, "/spark/c/shine"]) {
    assert.deepEqual(authorizeSparkPath(path, null), REFUSED, path);
  }
});

test("the doors stay open with no access, so a refusal has somewhere to land", () => {
  for (const path of ["/spark", "/spark/i/whatever", "/spark/signout"]) {
    assert.deepEqual(authorizeSparkPath(path, null), { allow: true }, path);
  }
});

test("paths outside Spark are not this guard's business", () => {
  assert.deepEqual(authorizeSparkPath("/", null), { allow: true });
  assert.deepEqual(authorizeSparkPath("/dashboard", null), { allow: true });
});

/* --------------------------------------------------------- cross client */

test("a member of one client cannot reach another", () => {
  assert.deepEqual(authorizeSparkPath(REDEEMER, shineClient), REFUSED);
  assert.deepEqual(authorizeSparkPath(`${REDEEMER}/budget`, shineClient), REFUSED);
  assert.deepEqual(
    authorizeSparkPath("/spark/c/redeemer-collective", shineClient),
    REFUSED,
  );
});

test("membership of one edition does not carry to another of the same event", () => {
  assert.deepEqual(
    authorizeSparkPath("/spark/c/shine/e/founders-weekend/2027", shineClient),
    REFUSED,
  );
});

test("every role reaches the schedule of its own workspace", () => {
  for (const who of [shineClient, shineGuest, shinePlanner]) {
    assert.deepEqual(authorizeSparkPath(`${SHINE}/schedule`, who), { allow: true });
  }
});

/* --------------------------------------------------- roles within a workspace */

test("a guest is held to the schedule, and sent there rather than away", () => {
  const home = { allow: false as const, redirectTo: `${SHINE}/schedule` };

  for (const section of ["", "/budget", "/sparks", "/tasks", "/resources", "/plan", "/meeting", "/review", "/run-of-show"]) {
    assert.deepEqual(authorizeSparkPath(`${SHINE}${section}`, shineGuest), home, section);
  }
});

test("a client reaches the working surfaces but not the run of show", () => {
  for (const section of ["", "/budget", "/sparks", "/tasks", "/resources", "/plan", "/meeting", "/review", "/schedule"]) {
    assert.deepEqual(
      authorizeSparkPath(`${SHINE}${section}`, shineClient),
      { allow: true },
      section,
    );
  }

  assert.deepEqual(authorizeSparkPath(`${SHINE}/run-of-show`, shineClient), {
    allow: false,
    redirectTo: SHINE,
  });
});

test("a planner reaches everything in their own engagement", () => {
  for (const section of ["", "/budget", "/sparks", "/run-of-show", "/schedule", "/review"]) {
    assert.deepEqual(
      authorizeSparkPath(`${SHINE}${section}`, shinePlanner),
      { allow: true },
      section,
    );
  }
});

test("a section nobody has named yet is planner only, not public", () => {
  assert.deepEqual(authorizeSparkPath(`${SHINE}/invoices`, shinePlanner), {
    allow: true,
  });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/invoices`, shineClient), {
    allow: false,
    redirectTo: SHINE,
  });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/invoices`, shineGuest), {
    allow: false,
    redirectTo: `${SHINE}/schedule`,
  });
});

test("the route rules match the lines the database draws", () => {
  /* run_of_show_cues is planner only in RLS; sparks, budget, tasks, resources
     and decisions are planner and client; schedule is every member. If these
     ever disagree, one of the two layers is lying about what is private. */
  assert.deepEqual(authorizeSparkPath(`${SHINE}/run-of-show`, shineGuest).allow, false);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/run-of-show`, shineClient).allow, false);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/budget`, shineGuest).allow, false);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/budget`, shineClient).allow, true);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/schedule`, shineGuest).allow, true);
});

/* ------------------------------------------------------- platform home */

test("the platform home requires the explicit staff grant", () => {
  assert.deepEqual(authorizeSparkPath(SPARK_PLATFORM, shineClient), REFUSED);
  assert.deepEqual(authorizeSparkPath(SPARK_PLATFORM, shineGuest), REFUSED);
  /* The sharp one. Being a planner is per engagement; it is not a platform
     wide grant, and it never was meant to read like one. */
  assert.deepEqual(authorizeSparkPath(SPARK_PLATFORM, shinePlanner), REFUSED);
  assert.deepEqual(authorizeSparkPath(SPARK_PLATFORM, staff), { allow: true });
});

test("a planner of one engagement is not a planner of the platform", () => {
  assert.deepEqual(authorizeSparkPath(REDEEMER, shinePlanner), REFUSED);
});

test("staff reach across clients, because that is what the grant is for", () => {
  assert.deepEqual(authorizeSparkPath(SHINE, staff), { allow: true });
  assert.deepEqual(authorizeSparkPath(REDEEMER, staff), { allow: true });
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", staff), { allow: true });
});

test("a verified identity that belongs to nothing reaches nothing", () => {
  assert.deepEqual(authorizeSparkPath(SHINE, stranger), REFUSED);
  assert.deepEqual(authorizeSparkPath(SPARK_PLATFORM, stranger), REFUSED);
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", stranger), REFUSED);
});

test("a client's own index needs membership of that client", () => {
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", shineClient), {
    allow: true,
  });
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", stranger), REFUSED);
});

/* ------------------------------------------------------------- landing */

test("one membership goes straight in", () => {
  assert.deepEqual(landingFor(shineClient), { kind: "workspace", href: SHINE });
});

test("a guest lands on the schedule, not on a page they would be refused", () => {
  const landing = landingFor(shineGuest);
  assert.deepEqual(landing, { kind: "workspace", href: `${SHINE}/schedule` });
  /* The landing must itself be allowed, or arriving would bounce forever. */
  assert.deepEqual(
    authorizeSparkPath((landing as { href: string }).href, shineGuest),
    { allow: true },
  );
});

test("no role can be landed somewhere it would be turned away from", () => {
  for (const who of [shineClient, shineGuest, shinePlanner, staff]) {
    const landing = landingFor(who);
    if (landing.kind !== "workspace" && landing.kind !== "platform") continue;
    assert.deepEqual(
      authorizeSparkPath(landing.href, who),
      { allow: true },
      landing.href,
    );
  }
});

test("several memberships offer a choice rather than picking one", () => {
  const both = access([
    workspace("shine", "founders-weekend", "2026", "client"),
    workspace("redeemer-collective", "leaders-retreat", "2027", "client"),
  ]);
  assert.deepEqual(landingFor(both), { kind: "choose" });
});

test("staff land on the platform home", () => {
  assert.deepEqual(landingFor(staff), { kind: "platform", href: SPARK_PLATFORM });
});

test("no memberships, and no session, are both a quiet refusal", () => {
  assert.deepEqual(landingFor(stranger), { kind: "refused" });
  assert.deepEqual(landingFor(null), { kind: "refused" });
});

/* -------------------------------------------------- shaping the answer */

test("a malformed database answer is no access, not a crash", () => {
  for (const bad of [
    null,
    undefined,
    "",
    0,
    [],
    {},
    { user_id: "u" },
    { email: "a@b.c" },
    { user_id: 1, email: "a@b.c" },
    { user_id: "u", email: null },
  ]) {
    assert.equal(readAccess(bad), null, JSON.stringify(bad ?? null));
  }
});

test("staff is only true when it is literally true", () => {
  const base = { user_id: "u", email: "a@b.c", workspaces: [] };
  assert.equal(readAccess({ ...base, staff: true })?.staff, true);
  for (const value of ["true", 1, {}, [], null, undefined]) {
    assert.equal(readAccess({ ...base, staff: value })?.staff, false);
  }
});

test("workspace rows that do not fit are dropped, not trusted", () => {
  const shaped = readAccess({
    user_id: "u",
    email: "a@b.c",
    staff: false,
    workspaces: [
      {
        engagement_id: "e1",
        role: "client",
        client_slug: "shine",
        client_name: "SHINE",
        event_slug: "founders-weekend",
        edition_slug: "2026",
        engagement_name: "Founders Weekend 2026",
      },
      /* An invented role must not become a role. */
      {
        engagement_id: "e2",
        role: "owner",
        client_slug: "x",
        event_slug: "y",
        edition_slug: "z",
      },
      { engagement_id: "e3" },
      null,
      "nope",
    ],
  });

  assert.equal(shaped?.workspaces.length, 1);
  assert.equal(shaped?.workspaces[0].clientSlug, "shine");
  assert.equal(shaped?.workspaces[0].role, "client");
});

test("workspaces missing entirely is an empty list, not a failure", () => {
  const shaped = readAccess({ user_id: "u", email: "a@b.c", staff: false });
  assert.deepEqual(shaped?.workspaces, []);
});

/* -------------------------------------------------- invitation tokens */

test("invitation tokens are unguessable and distinct", () => {
  const tokens = new Set(
    Array.from({ length: 500 }, () => randomInvitationToken()),
  );
  assert.equal(tokens.size, 500);
  for (const token of tokens) assert.equal(looksLikeInvitationToken(token), true);
});

test("anything not shaped like a token is rejected before the database", () => {
  for (const bad of [
    undefined,
    "",
    "short",
    "A".repeat(32),
    "-".repeat(32),
    `${randomInvitationToken()}x`,
    randomInvitationToken().slice(0, 31),
    "../../etc/passwd",
    "' or 1=1 --",
  ]) {
    assert.equal(looksLikeInvitationToken(bad as string | undefined), false, String(bad));
  }
});

test("only the hash is ever storable, and it does not contain the token", async () => {
  const token = randomInvitationToken();
  const hash = await hashInvitationToken(token);

  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes(token), false);
  /* Stable, or an existing invitation would stop being findable. */
  assert.equal(await hashInvitationToken(token), hash);
  assert.notEqual(await hashInvitationToken(randomInvitationToken()), hash);
});
