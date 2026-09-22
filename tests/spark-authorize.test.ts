import assert from "node:assert/strict";
import test from "node:test";

import { authorizeSparkPath, landingFor } from "../lib/spark/authorize.ts";
import {
  canonicalGuidePath,
  lockedPreviewPath,
  preferShortPath,
  shortGuidePath,
  SPARK_BASE,
  PLATFORM_HOME,
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

test("every role reaches the weekend guide of its own workspace", () => {
  for (const who of [shineClient, shineGuest, shinePlanner]) {
    assert.deepEqual(authorizeSparkPath(SHINE, who), { allow: true });
  }
});

test("the calendar is for working members; a guest reads the guide instead", () => {
  assert.deepEqual(authorizeSparkPath(`${SHINE}/schedule`, shinePlanner), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/schedule`, shineClient), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/schedule`, shineGuest), {
    allow: false,
    redirectTo: "/shine/2026",
  });
});

/* ------------------------------------------------------- the weekend guide */

test("a published guide is open to anyone, with no session at all", () => {
  assert.deepEqual(authorizeSparkPath(SHINE, null, { publicGuide: true }), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/`, null, { publicGuide: true }), { allow: true });
  assert.deepEqual(authorizeSparkPath(SHINE, stranger, { publicGuide: true }), { allow: true });
});

test("an unpublished guide is as closed as the rest of the workspace", () => {
  assert.deepEqual(authorizeSparkPath(SHINE, null), REFUSED);
  assert.deepEqual(authorizeSparkPath(SHINE, null, { publicGuide: false }), REFUSED);
  assert.deepEqual(authorizeSparkPath(SHINE, stranger), REFUSED);
});

test("publishing the guide opens the root and nothing beneath it", () => {
  /* The team address is navigation, not permission: publishing the guest
     guide must never carry the run of show out with it. */
  for (const section of ["/team", "/schedule", "/budget", "/plan", "/actions"]) {
    assert.deepEqual(
      authorizeSparkPath(`${SHINE}${section}`, null, { publicGuide: true }),
      REFUSED,
      section,
    );
  }
  assert.deepEqual(
    authorizeSparkPath(`${SHINE}/team`, shineGuest, { publicGuide: true }),
    { allow: false, redirectTo: "/shine/2026" },
  );
});

test("the team guide is for working members only", () => {
  assert.deepEqual(authorizeSparkPath(`${SHINE}/team`, shinePlanner), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/team`, shineClient), { allow: true });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/team`, shineGuest), {
    allow: false,
    redirectTo: "/shine/2026",
  });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/team`, stranger), REFUSED);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/team`, null), REFUSED);
});

/* --------------------------------------------------- roles within a workspace */

test("a guest is held to the guide, and sent there rather than away", () => {
  const home = { allow: false as const, redirectTo: "/shine/2026" };

  for (const section of ["/schedule", "/team", "/budget", "/plan", "/actions", "/sparks", "/tasks", "/resources"]) {
    assert.deepEqual(authorizeSparkPath(`${SHINE}${section}`, shineGuest), home, section);
  }
});

test("a client reaches the working surfaces but not the retired planner paths", () => {
  for (const section of ["", "/team", "/budget", "/plan", "/actions", "/schedule"]) {
    assert.deepEqual(
      authorizeSparkPath(`${SHINE}${section}`, shineClient),
      { allow: true },
      section,
    );
  }

  /* Decisions and the old run of show are no longer routes; their old paths
     fall to the planner-only default and reveal nothing. */
  for (const retired of ["/run-of-show", "/decisions", "/sparks", "/tasks", "/resources"]) {
    assert.deepEqual(authorizeSparkPath(`${SHINE}${retired}`, shineClient), {
      allow: false,
      redirectTo: "/shine/2026/team",
    }, retired);
  }
});

test("a planner reaches everything in their own engagement", () => {
  for (const section of ["", "/team", "/budget", "/plan", "/actions", "/schedule", "/review"]) {
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
    redirectTo: "/shine/2026/team",
  });
  assert.deepEqual(authorizeSparkPath(`${SHINE}/invoices`, shineGuest), {
    allow: false,
    redirectTo: "/shine/2026",
  });
});

test("the route rules match the lines the database draws", () => {
  /* run_of_show_cues is planner only in RLS; sparks, budget, tasks,
     resources and the team's run of show detail are planner and client; a
     guest reads public moments only, through the guide. If these ever
     disagree, one of the two layers is lying about what is private. */
  assert.deepEqual(authorizeSparkPath(`${SHINE}/run-of-show`, shineGuest).allow, false);
  assert.deepEqual(authorizeSparkPath(`${SHINE}/run-of-show`, shineClient).allow, false);
  for (const section of ["/budget", "/actions", "/plan", "/team", "/schedule"]) {
    assert.deepEqual(authorizeSparkPath(`${SHINE}${section}`, shineGuest).allow, false, section);
    assert.deepEqual(authorizeSparkPath(`${SHINE}${section}`, shineClient).allow, true, section);
  }
  assert.deepEqual(authorizeSparkPath(SHINE, shineGuest).allow, true);
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

test("a client's own index is a working surface, not a member surface", () => {
  /* The index shows per engagement budget rollups and spark counts, so it
     draws the same line the workspace overview does. B1 regression: this is
     the rule a review found missing, and these assertions keep it found. */
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", shineClient), {
    allow: true,
  });
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", shinePlanner), {
    allow: true,
  });
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", staff), { allow: true });

  /* A stakeholder is a member of the client, and still must not see the
     rollups. Sent to their own home in it, not out of Spark. */
  assert.deepEqual(authorizeSparkPath("/spark/c/shine", shineGuest), {
    allow: false,
    redirectTo: "/shine/2026",
  });

  assert.deepEqual(authorizeSparkPath("/spark/c/shine", stranger), REFUSED);

  /* And a working member of one client is still nobody at another. */
  assert.deepEqual(
    authorizeSparkPath("/spark/c/redeemer-collective", shineClient),
    REFUSED,
  );
});

/* ------------------------------------------------------------- landing */

test("one membership goes straight in, and the team lands on the team guide", () => {
  assert.deepEqual(landingFor(shineClient), { kind: "workspace", href: "/shine/2026/team" });
});

test("a planner lands on the calendar, where the weekend is edited", () => {
  assert.deepEqual(landingFor(shinePlanner), { kind: "workspace", href: `${SHINE}/schedule` });
});

test("a guest lands on the guide, not on a page they would be refused", () => {
  const landing = landingFor(shineGuest);
  assert.deepEqual(landing, { kind: "workspace", href: "/shine/2026" });
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

test("staff land on the platform home, which is Stewardship.Capital's own", () => {
  assert.deepEqual(landingFor(staff), { kind: "platform", href: PLATFORM_HOME });
  /* Outside Spark on purpose: the guard for it lives in the proxy, not here. */
  assert.equal(isSparkPath(PLATFORM_HOME), false);
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

/* --------------------------------------------------------- short addresses */

test("the printed address stands for the workspace path, and only for the guide", () => {
  assert.equal(canonicalGuidePath("/shine/2026"), SHINE);
  assert.equal(canonicalGuidePath("/shine/2026/"), SHINE);
  assert.equal(canonicalGuidePath("/shine/2026/team"), `${SHINE}/team`);

  /* A short address cannot be widened into the working surfaces by adding a
     segment. Those keep the long path, so nothing is published at the top
     level that was never meant to be. */
  for (const section of ["/schedule", "/budget", "/plan", "/actions", "/team/extra"]) {
    assert.equal(canonicalGuidePath(`/shine/2026${section}`), null, section);
  }
  assert.equal(canonicalGuidePath("/spark"), null);
  assert.equal(canonicalGuidePath("/login"), null);
});

test("the old guide addresses map back to the short ones, and nothing else does", () => {
  assert.equal(shortGuidePath(SHINE), "/shine/2026");
  assert.equal(shortGuidePath(`${SHINE}/`), "/shine/2026");
  assert.equal(shortGuidePath(`${SHINE}/team`), "/shine/2026/team");

  assert.equal(shortGuidePath(`${SHINE}/schedule`), null, "the calendar keeps its path");
  assert.equal(shortGuidePath("/spark/c/other/e/retreat/2026"), null, "another client is untouched");
  assert.equal(preferShortPath(`${SHINE}/schedule`), `${SHINE}/schedule`);
  assert.equal(preferShortPath(SPARK_BASE), SPARK_BASE);
});

test("the team address has a public front door, and only that address does", () => {
  assert.equal(lockedPreviewPath("/shine/2026/team"), "/shine/2026/team-locked");
  assert.equal(lockedPreviewPath("/shine/2026/team/"), "/shine/2026/team-locked");

  /* Nothing else gets one: a refusal anywhere else is still a refusal. */
  assert.equal(lockedPreviewPath("/shine/2026"), null);
  assert.equal(lockedPreviewPath("/shine/2026/schedule"), null);
  assert.equal(lockedPreviewPath(`${SHINE}/team`), null, "the old address redirects first");
  assert.equal(lockedPreviewPath("/spark/c/other/e/retreat/2026/team"), null);

  /* The page it serves is a public page of its own, so the guard must leave
     it alone rather than sending it back through itself. */
  assert.equal(canonicalGuidePath("/shine/2026/team-locked"), null);
});

test("arrivals land on the printed address, never on the old one", () => {
  assert.deepEqual(landingFor(shineGuest), { kind: "workspace", href: "/shine/2026" });
  assert.deepEqual(landingFor(shineClient), { kind: "workspace", href: "/shine/2026/team" });
  /* The planner lands on the calendar, which is not a printed address. */
  assert.deepEqual(landingFor(shinePlanner), { kind: "workspace", href: `${SHINE}/schedule` });

  /* A refusal inside the workspace is sent to the short address too. */
  const refused = authorizeSparkPath(`${SHINE}/budget`, shineGuest);
  assert.deepEqual(refused, { allow: false, redirectTo: "/shine/2026" });
});
