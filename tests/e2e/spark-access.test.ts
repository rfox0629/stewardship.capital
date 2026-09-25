import assert from "node:assert/strict";
import test from "node:test";

import {
  accessTokenOf,
  admin,
  adopt,
  anonClient,
  BASE_URL,
  expireAccessToken,
  clientFor,
  createIdentity,
  linkFor,
  newJar,
  restartBrowser,
  RUN,
  signIn,
  TEST_DOMAIN,
  visit,
} from "./harness.ts";
import { hashInvitationToken, randomInvitationToken } from "../../lib/spark/tokens.ts";

/**
 * The access model, against the real database and the real running app.
 *
 * Nothing here is stubbed. Identities are genuine Supabase identities, the
 * schema is production's, the requests go over HTTP through the actual proxy,
 * and the invitations are rows.
 *
 * Method note, learned the hard way earlier in this work: row level security
 * filters UPDATE and DELETE silently rather than raising. A call that returns
 * no error has not necessarily written anything, and a call that writes
 * nothing has not necessarily been refused. Every mutation assertion below
 * measures rows actually affected.
 */

/* The suite's own two organizations. No route in this file addresses a real
   client; the real engagement is only ever fingerprinted, read only, by the
   runner around this whole suite. */
const A_SLUG = `${RUN}-alpha`;
const B_SLUG = `${RUN}-beta`;
const A_NAME = `Alpha ${RUN}`;
const B_NAME = `Beta ${RUN}`;
const A_HOME = `/spark/c/${A_SLUG}/e/check/2026`;
const B_HOME = `/spark/c/${B_SLUG}/e/check/2027`;
const PLATFORM = "/platform";
const OLD_PLATFORM = "/spark/platform";
const B_PAGE = `/platform/clients/${B_SLUG}/check-2027`;
const A_PAGE = `/platform/clients/${A_SLUG}/check-2026`;
const ENTRY = "/spark";

const CLEAN = "authcheck";

type Identity = { id: string; email: string };

type World = {
  staff: Identity;
  client: Identity;
  guest: Identity;
  otherPlanner: Identity;
  stranger: Identity;
  invitee: Identity;
  multi: Identity;
  leaver: Identity;
  alphaId: string;
  betaId: string;
  alphaOrgId: string;
  betaOrgId: string;
  alphaSparkId: string;
  betaSparkId: string;
};

const invitation = async (
  engagementId: string,
  email: string,
  role: string,
  options: { expired?: boolean } = {},
) => {
  const token = randomInvitationToken();
  const expiresAt = options.expired
    ? new Date(Date.now() - 60_000)
    : new Date(Date.now() + 3_600_000);

  const { error } = await admin.from("invitations").insert({
    engagement_id: engagementId,
    email,
    role,
    token_hash: await hashInvitationToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`could not mint invitation: ${error.message}`);

  return token;
};

const setUp = async (): Promise<World> => {
  const [staff, client, guest, otherPlanner, stranger, invitee, multi, leaver] =
    await Promise.all(
      [
        "staff", "client", "guest", "otherplanner",
        "stranger", "invitee", "multi", "leaver",
      ].map(createIdentity),
    );

  /* Two organizations of this run's own. If either cannot be created, the
     suite refuses to run at all rather than fall back to anything real. */
  const makeOrg = async (
    slug: string,
    name: string,
    edition: string,
    productKey: string | null,
  ) => {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ slug, name })
      .select("id")
      .single();
    if (orgError || !org) {
      throw new Error(`isolation could not be established: ${orgError?.message}`);
    }
    const { data: eng, error: engError } = await admin
      .from("engagements")
      .insert({
        organization_id: org.id,
        slug: `check-${edition}`,
        name: `${name} Check`,
        series_slug: "check",
        edition_label: edition,
        product_key: productKey,
      })
      .select("id")
      .single();
    if (engError || !eng) {
      throw new Error(`isolation could not be established: ${engError?.message}`);
    }
    return { orgId: org.id as string, engagementId: eng.id as string };
  };

  /* Alpha runs on Spark, like SHINE. Beta runs on no product, like a
     consulting engagement, so it opens the Stewardship.Capital page. */
  const alpha = await makeOrg(A_SLUG, A_NAME, "2026", "spark");
  const beta = await makeOrg(B_SLUG, B_NAME, "2027", null);
  const alphaId = alpha.engagementId;
  const betaId = beta.engagementId;

  await admin.from("platform_staff").insert({ user_id: staff.id });
  await admin.from("workspace_members").insert([
    { engagement_id: alphaId, user_id: staff.id, role: "planner" },
    { engagement_id: alphaId, user_id: client.id, role: "client" },
    { engagement_id: alphaId, user_id: guest.id, role: "stakeholder" },
    { engagement_id: alphaId, user_id: multi.id, role: "client" },
    { engagement_id: betaId, user_id: otherPlanner.id, role: "planner" },
    { engagement_id: betaId, user_id: multi.id, role: "client" },
    { engagement_id: alphaId, user_id: leaver.id, role: "client" },
  ]);

  const { data: sparks } = await admin
    .from("sparks")
    .insert([
      { engagement_id: alphaId, title: `${CLEAN} alpha`, category: "Experience" },
      { engagement_id: betaId, title: `${CLEAN} beta`, category: "Experience" },
    ])
    .select("id, engagement_id");

  await admin.from("budget_lines").insert([
    { engagement_id: alphaId, category: "Venue and lodging", label: `${CLEAN} alpha`, planned_cents: 1000 },
    { engagement_id: betaId, category: "Venue and lodging", label: `${CLEAN} beta`, planned_cents: 1000 },
  ]);

  const { data: items } = await admin
    .from("schedule_items")
    .insert([
      { engagement_id: alphaId, day_key: "thu", starts_label: "3:00 pm", title: `${CLEAN} confirmed`, track: "Hospitality", status: "confirmed" },
      { engagement_id: alphaId, day_key: "fri", starts_label: "8:45 am", title: `${CLEAN} draft`, track: "Program", status: "draft" },
    ])
    .select("id");

  await admin.from("run_of_show_cues").insert({
    engagement_id: alphaId,
    schedule_item_id: items![0].id,
    at_label: "3:00 pm",
    cue: `${CLEAN} cue`,
  });

  return {
    staff, client, guest, otherPlanner, stranger, invitee, multi, leaver,
    alphaId,
    betaId,
    alphaOrgId: alpha.orgId,
    betaOrgId: beta.orgId,
    alphaSparkId: sparks!.find((s) => s.engagement_id === alphaId)!.id,
    betaSparkId: sparks!.find((s) => s.engagement_id === betaId)!.id,
  };
};

const tearDown = async (world: World | null) => {
  /* The two organizations are deleted by the exact ids captured at setup;
     their engagements, memberships, invitations, and content cascade with
     them. Nothing here names a table pattern that could ever reach a real
     client's rows. */
  if (world) {
    await admin
      .from("organizations")
      .delete()
      .in("id", [world.alphaOrgId, world.betaOrgId]);

    for (const person of [
      world.staff, world.client, world.guest, world.otherPlanner,
      world.stranger, world.invitee, world.multi, world.leaver,
    ]) {
      await admin.auth.admin.deleteUser(person.id).catch(() => {});
    }
  }

  /* Anyone the app created along the way, for example by following an
     invitation link that had never been signed in to before. The domain is
     stamped with this run's id, so the sweep can only match this run. */
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const user of data?.users ?? []) {
    if (user.email?.endsWith(`@${TEST_DOMAIN}`)) {
      await admin.auth.admin.deleteUser(user.id).catch(() => {});
    }
  }
};

test("Spark access model, end to end against production schema", async (t) => {
  let world: World | null = null;

  try {
    world = await setUp();
    const w = world;

    /* ------------------------------------------------ anonymous refusal */

    await t.test("the public cannot enter Spark", async () => {
      for (const path of [A_HOME, `${A_HOME}/budget`, B_HOME, OLD_PLATFORM, "/spark/c/shine"]) {
        const hit = await visit(newJar(), path);
        assert.equal(hit.status, 307, path);
        assert.equal(hit.location, path === OLD_PLATFORM ? PLATFORM : ENTRY, path);
      }
    });

    await t.test("the platform home, signed out, is the door and nothing else", async () => {
      const hit = await visit(newJar(), PLATFORM);
      assert.equal(hit.status, 200);
      assert.match(hit.body, /Sign in to continue/);
      assert.match(hit.body, /id="entry-email"/);
      /* Nothing the signed in page shows may leak through the door. */
      assert.doesNotMatch(hit.body, /New client|New engagement|Platform staff/);
      assert.doesNotMatch(
        hit.body,
        new RegExp(`SHINE|Founders Weekend|${A_NAME}|${B_NAME}`, "i"),
      );
    });

    await t.test("the old platform address redirects to the new one", async () => {
      const hit = await visit(newJar(), OLD_PLATFORM);
      assert.ok(hit.status >= 300 && hit.status < 400, `answered ${hit.status}`);
      assert.equal(hit.location, PLATFORM);
    });

    await t.test("the front door is reachable, and says only what it should", async () => {
      const hit = await visit(newJar(), ENTRY);
      assert.equal(hit.status, 200);
      assert.match(hit.body, /Capture freely\. Discern carefully\. Move intentionally\./);
      assert.match(hit.body, /Spark/);
      /* Universal on purpose. No client is named on the way in, not the real
         one and not this run's. */
      assert.doesNotMatch(
        hit.body,
        new RegExp(`SHINE|Founders Weekend|${A_NAME}|${B_NAME}`, "i"),
      );
    });

    await t.test("the old addresses still lead to Spark", async () => {
      const moved: Array<[string, string]> = [
        ["/more", ENTRY],
        ["/events-os", ENTRY],
        ["/events-os/c/shine/e/founders-weekend/2026", "/spark/c/shine/e/founders-weekend/2026"],
        ["/i/abcdefghijklmnopqrstuvwxyz012345", "/spark/i/abcdefghijklmnopqrstuvwxyz012345"],
        ["/events", ENTRY],
        ["/connect", ENTRY],
      ];

      for (const [from, to] of moved) {
        const hit = await visit(newJar(), from);
        assert.ok(hit.status >= 300 && hit.status < 400, `${from} answered ${hit.status}`);
        assert.equal(hit.location, to, from);
      }
    });

    await t.test("the homepage says three words and opens no door", async () => {
      const hit = await visit(newJar(), "/");
      assert.equal(hit.status, 200);
      assert.match(hit.body, /Time\.|Talent\.|Treasure\./);
      assert.match(hit.body, /Steward what you.{1,8}ve been entrusted with\./);
      /* Word of mouth, on purpose. No link to Spark, no form, no login, no
         call to action of any kind. */
      assert.doesNotMatch(hit.body, /href="\/(spark|start|platform|login|signup|more)"/);
      assert.doesNotMatch(hit.body, /Spark|Romans 14:12|>More<|Start a conversation/);
      assert.equal((await visit(newJar(), "/start")).status, 404);
    });

    await t.test("anonymous callers see nothing in the database either", async () => {
      const anon = anonClient();
      for (const table of ["organizations", "engagements", "sparks", "invitations", "workspace_members"]) {
        const { data } = await anon.from(table).select("*");
        assert.equal(data?.length ?? 0, 0, table);
      }
      const { data: access } = await anon.rpc("my_access");
      assert.equal(access, null);
    });

    /* ------------------------------------- knowing an address is not enough */

    await t.test("knowing a member's address grants nothing on its own", async () => {
      /* The address below is a real member's. Everything about this request is
         correct except that nobody has proved they read it. */
      const jar = newJar();
      jar.set("spark_otp", { value: w.client.email, persistent: false });

      const hit = await visit(jar, A_HOME);
      assert.equal(hit.status, 307);
      assert.equal(hit.location, ENTRY);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.status, 200);
      /* Claiming an address gets as far as being asked for the code, and no
         further. It does not become a session and it names no workspace. */
      assert.doesNotMatch(entry.body, /SHINE|Founders Weekend/i);
      assert.equal(
        Array.from(jar.keys()).some((name) => name.startsWith("sb-")),
        false,
        "no session was issued merely by claiming an address",
      );
    });

    await t.test("an unknown address does not become an account", async () => {
      const unknown = `never-invited@${TEST_DOMAIN}`;
      await anonClient().auth.signInWithOtp({
        email: unknown,
        options: { shouldCreateUser: false },
      });

      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      const created = data?.users.some((user) => user.email === unknown);
      assert.equal(created, false, "shouldCreateUser false must mean no signup");
    });

    await t.test("a wrong code does not verify", async () => {
      const supabase = anonClient();
      const { error } = await supabase.auth.verifyOtp({
        email: w.client.email,
        token: "000000",
        type: "email",
      });
      assert.ok(error, "a guessed code must be refused");
      const { data } = await supabase.auth.getSession();
      assert.equal(data.session, null);
    });

    await t.test("the emailed code verifies, and is single use", async () => {
      const { code } = await linkFor(w.client.email);
      const supabase = anonClient();

      const { data, error } = await supabase.auth.verifyOtp({
        email: w.client.email,
        token: code,
        type: "email",
      });
      assert.equal(error, null);
      assert.ok(data.session, "a correct code establishes a session");

      const again = await anonClient().auth.verifyOtp({
        email: w.client.email,
        token: code,
        type: "email",
      });
      assert.ok(again.error, "a code already used must not verify twice");
    });

    /* ------------------------------------------------ workspace routing */

    await t.test("one membership routes straight into the engagement", async () => {
      const jar = newJar();
      const landed = await signIn(jar, w.client.email);
      assert.equal(landed.status, 307);
      assert.equal(landed.location, `${A_HOME}/team`);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.location, `${A_HOME}/team`, "returning goes straight back in");
    });

    await t.test("several memberships offer only that person's own", async () => {
      const jar = newJar();
      const landed = await signIn(jar, w.multi.email);
      assert.equal(landed.location, ENTRY);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.status, 200);
      assert.match(entry.body, new RegExp(A_NAME));
      assert.match(entry.body, new RegExp(B_NAME));
      /* The selector is a list of memberships, never a list of clients, and
         the real client on the platform must never appear in it. */
      assert.doesNotMatch(entry.body, /SHINE|Founders Weekend/i);
    });

    await t.test("no memberships is a quiet refusal, not an explanation", async () => {
      const jar = newJar();
      await signIn(jar, w.stranger.email);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.status, 200);
      assert.match(entry.body, /invitation only/i);
      assert.doesNotMatch(
        entry.body,
        new RegExp(`SHINE|Founders Weekend|${A_NAME}|${B_NAME}`, "i"),
      );

      const blocked = await visit(jar, A_HOME);
      assert.equal(blocked.location, ENTRY);
    });

    await t.test("platform staff land on the platform home", async () => {
      const jar = newJar();
      const landed = await signIn(jar, w.staff.email);
      assert.equal(landed.location, PLATFORM);
      const home = await visit(jar, PLATFORM);
      assert.equal(home.status, 200);
      assert.match(home.body, /New client|Platform staff/);
      /* Spark's front door no longer holds them either: it sends them home. */
      assert.equal((await visit(jar, ENTRY)).location, PLATFORM);
    });

    /* ------------------------------------- engagements that run on nothing */

    await t.test("the platform home opens each engagement where it lives", async () => {
      const jar = await adopt(w.staff.email);
      const home = await visit(jar, PLATFORM);
      assert.equal(home.status, 200);
      /* A product engagement opens the product, which lives on its own
         domain now, so the link is a whole URL. */
      assert.match(home.body, new RegExp(`href="https://tentmaiker.com/c/${A_SLUG}/e/check/2026"`));
      assert.doesNotMatch(home.body, new RegExp(`href="${A_HOME}"`), "not the implementation path");
      /* Engagements on no product open the Stewardship.Capital page. */
      assert.match(home.body, new RegExp(`href="${B_PAGE}"`));
      assert.doesNotMatch(home.body, new RegExp(`href="${B_HOME}"`));
    });

    await t.test("the engagement page is the overview and the notes, staff only", async () => {
      const jar = await adopt(w.staff.email);
      const page = await visit(jar, B_PAGE);
      assert.equal(page.status, 200);
      assert.match(page.body, new RegExp(B_NAME));
      assert.match(page.body, /Overview/);
      assert.match(page.body, /Meetings and notes/);
      assert.match(page.body, /name="title"/);

      /* A product engagement has its own home, on the product's domain. */
      const sparkOne = await visit(jar, A_PAGE);
      assert.equal(sparkOne.status, 307);
      assert.equal(sparkOne.location, `/c/${A_SLUG}/e/check/2026`);

      /* Signed out is the door. A member of the very engagement is refused. */
      assert.equal((await visit(newJar(), B_PAGE)).location, PLATFORM);
      const asClient = await visit(await adopt(w.client.email), B_PAGE);
      assert.equal(asClient.status, 307);
      assert.equal(asClient.location, ENTRY);
    });

    await t.test("notes are written and read by staff, and by nobody else", async () => {
      const asStaff = await clientFor(w.staff.email);
      const { data: written, error } = await asStaff
        .from("engagement_notes")
        .insert({ engagement_id: w.betaId, title: `Note ${RUN}`, body: `Thought ${RUN}.` })
        .select("id");
      assert.equal(error, null, error?.message);
      assert.equal(written?.length, 1, "rows affected");

      const { data: read } = await asStaff.rpc("engagement_notes_for", { target: w.betaId });
      assert.equal(read?.length, 1);
      assert.equal(read?.[0].title, `Note ${RUN}`);
      assert.equal(read?.[0].author_email, w.staff.email);

      const page = await visit(await adopt(w.staff.email), B_PAGE);
      assert.match(page.body, new RegExp(`Note ${RUN}`));
      assert.match(page.body, new RegExp(`Thought ${RUN}\\.`));

      /* A member of the engagement, a planner elsewhere, and a stranger:
         nothing to read, nothing to write, through either door. */
      for (const who of [w.client, w.otherPlanner, w.stranger]) {
        const asOther = await clientFor(who.email);
        const { data: seen } = await asOther.from("engagement_notes").select("id");
        assert.equal(seen?.length ?? 0, 0, who.email);
        const { data: viaRpc } = await asOther.rpc("engagement_notes_for", { target: w.betaId });
        assert.equal(viaRpc?.length ?? 0, 0, who.email);
        const attempt = await asOther
          .from("engagement_notes")
          .insert({ engagement_id: w.betaId, title: `Intruder ${RUN}`, body: "no" })
          .select("id");
        assert.equal(attempt.data?.length ?? 0, 0, who.email);
      }
      const anon = anonClient();
      const { data: anonSeen } = await anon.from("engagement_notes").select("id");
      assert.equal(anonSeen?.length ?? 0, 0);

      /* Still exactly one note, and it is the staff one. */
      const { data: all } = await admin.from("engagement_notes").select("id").eq("engagement_id", w.betaId);
      assert.equal(all?.length, 1);
    });

    /* --------------------------------------------- direct URLs and roles */

    await t.test("a direct workspace URL for another client is refused", async () => {
      const jar = await adopt(w.client.email);

      for (const path of [B_HOME, `${B_HOME}/budget`, `/spark/c/${B_SLUG}`]) {
        const hit = await visit(jar, path);
        assert.equal(hit.status, 307, path);
        assert.equal(hit.location, ENTRY, path);
      }
    });

    await t.test("a client cannot reach the planner home", async () => {
      const jar = await adopt(w.client.email);
      const hit = await visit(jar, PLATFORM);
      assert.equal(hit.status, 307);
      assert.equal(hit.location, ENTRY);
    });

    await t.test("being a planner of one engagement is not platform access", async () => {
      const jar = await adopt(w.otherPlanner.email);

      /* Their own engagement is authorized. It answers 404 rather than 200
         because the workspace screens still render seeded content and this
         test client exists only in the database, which is the known gap
         between authorization and data. What matters here is that the guard
         let the request through instead of turning it away. */
      const own = await visit(jar, B_HOME);
      assert.notEqual(own.location, ENTRY, "authorized, whatever the screen finds");
      assert.ok([200, 404].includes(own.status), `unexpected ${own.status}`);

      assert.equal((await visit(jar, PLATFORM)).location, ENTRY);
      assert.equal((await visit(jar, A_HOME)).location, ENTRY);
    });

    await t.test("a guest reaches the guide, and only the guide", async () => {
      const jar = await adopt(w.guest.email);

      assert.equal((await visit(jar, A_HOME)).status, 200);
      assert.equal((await visit(jar, PLATFORM)).location, ENTRY);

      /* Inside their own workspace, held to their own part of it, and sent to
         it rather than out of Spark. */
      for (const section of ["/schedule", "/team", "/budget", "/plan", "/actions", "/sparks", "/tasks", "/resources"]) {
        const hit = await visit(jar, `${A_HOME}${section}`);
        assert.equal(hit.status, 307, section);
        assert.equal(hit.location, A_HOME, section);
      }

      /* B1 regression: the client index carries budget rollups, and being a
         member of the client is not enough to see them. */
      const index = await visit(jar, `/spark/c/${A_SLUG}`);
      assert.equal(index.status, 307, "the client index is a working surface");
      assert.equal(index.location, A_HOME);
    });

    await t.test("a client works the engagement but never sees the run of show", async () => {
      const jar = await adopt(w.client.email);

      /* The client index stays theirs: B1 must not overcorrect. It still
         renders from the seeded store, which does not know this run's
         organization, so authorized is proven by not being turned away. */
      const index = await visit(jar, `/spark/c/${A_SLUG}`);
      assert.notEqual(index.location, ENTRY, "authorized at the client index");
      assert.ok([200, 404].includes(index.status), `unexpected ${index.status}`);

      for (const section of ["", "/team", "/budget", "/plan", "/schedule", "/actions"]) {
        assert.equal((await visit(jar, `${A_HOME}${section}`)).status, 200, section);
      }

      /* The retired planner paths fall to the planner-only default. */
      for (const retired of ["/run-of-show", "/decisions", "/sparks", "/tasks", "/resources"]) {
        const hit = await visit(jar, `${A_HOME}${retired}`);
        assert.equal(hit.status, 307, retired);
        assert.equal(hit.location, `${A_HOME}/team`, retired);
      }
    });

    /* ------------------------------------------------- the printed address */

    await t.test("the short address is the SHINE guide, and the old one redirects", async () => {
      /* This engagement is the real one, so everything here is a read. The
         guest guide is published, which is why an anonymous visitor may see
         it at all. */
      const SHORT = "/shine/2026";
      const LONG = "/spark/c/shine/e/founders-weekend/2026";

      const anon = newJar();
      const guide = await visit(anon, SHORT);
      assert.equal(guide.status, 200, "no account needed at the short address");
      assert.match(guide.body, /Founders Weekend/);

      /* The old addresses are retired, and a query string survives the move. */
      const moved = await visit(newJar(), LONG);
      assert.equal(moved.status, 307);
      assert.equal(moved.location, SHORT);

      const movedTeam = await visit(newJar(), `${LONG}/team?day=fri&open=abc`);
      assert.equal(movedTeam.status, 307);
      assert.equal(movedTeam.location, `${SHORT}/team`);
      assert.match(movedTeam.locationSearch ?? "", /day=fri/, "the query string comes along");
      assert.match(movedTeam.locationSearch ?? "", /open=abc/);

      /* A different address is navigation, not permission. Signed out, the
         team address answers with its own public front door so that a link
         pasted into a message previews as the weekend rather than as a sign
         in screen. What it says is the name of the weekend and nothing else:
         no run of show, no duties, no names. */
      const team = await visit(newJar(), `${SHORT}/team`);
      assert.equal(team.status, 200, "a crawler gets a page, not a redirect");
      assert.match(team.body, /SHINE Founders Weekend 2026 \| Team/);
      assert.match(team.body, /run of show, volunteer duties, and personal schedule/);
      assert.match(team.body, /Welcome, SHINE Team/, "the weekend's own door");
      assert.match(team.body, /Enter the team code/);
      assert.doesNotMatch(team.body, /Spark/i, "nobody is sent to a product they have not heard of");
      assert.doesNotMatch(team.body, /SHINE2026/, "the code is never on the page");
      for (const secret of ["Run of show", "Volunteer duties", "My schedule", "Catering Team", "Assigned team"]) {
        assert.doesNotMatch(team.body, new RegExp(secret), secret);
      }

      /* The preview carries whole URLs, or a messaging app has nothing to
         fetch, and the photograph is the weekend's own. */
      assert.match(team.body, /og:image"? content="https:\/\/[^"]+founders-weekend-2026-v3\.jpg/);
      assert.match(team.body, /summary_large_image/);

      /* And the short namespace reaches the guide only: the working surfaces
         are not quietly published at the top level. */
      for (const section of ["/schedule", "/budget", "/plan", "/actions"]) {
        const hit = await visit(newJar(), `${SHORT}${section}`);
        assert.equal(hit.status, 404, section);
      }
    });

    /* --------------------------------------------------- ideas and the grid */

    await t.test("the calendar offers its ideas, and they can be carried onto an hour", async () => {
      /* The one way an idea becomes a moment is a chip in this strip. It went
         missing once when the screen was rebuilt, which left the drop handler
         on the grid with nothing that could ever reach it, so the strip and
         its drag payload are asserted here rather than assumed. */
      const jar = await adopt(w.staff.email);
      const calendar = await visit(jar, `${A_HOME}/schedule`);
      assert.equal(calendar.status, 200);

      assert.match(calendar.body, /class="ev-bank ev-bank-ideas/, "the ideas strip is drawn");
      assert.match(calendar.body, new RegExp(`${CLEAN} alpha`), "and holds this engagement's idea");
      /* The chip carries its own instructions. It becomes draggable on
         hydration, so the server's copy says "false" here and the drag
         itself is exercised in the browser rather than asserted from HTML. */
      assert.match(calendar.body, /ev-bank-chip ev-bank-idea/, "the chip is drawn");
      assert.match(calendar.body, /Drag onto an hour, or click to open it/);

      /* A client is not a planner: same screen, no strip to drag from. */
      const reader = await adopt(w.client.email);
      const asClient = await visit(reader, `${A_HOME}/schedule`);
      assert.equal(asClient.status, 200);
      assert.doesNotMatch(asClient.body, /ev-bank-ideas/, "and only a planner is offered it");
    });

    /* ------------------------------------------------------ the guest card */

    await t.test("the guest guide is the printed card, and the meals still open", async () => {
      /* A guest is handed a card with three days on it. The guide says the
         same thing: the same lines, the same windows, the same words. What it
         must not do is show them how the weekend is run. */
      const guest = await visit(newJar(), "/shine/2026");
      assert.equal(guest.status, 200);

      for (const line of ["Arrival", "Appetizers and Fellowship", "Worship and Vision",
                          "Breakfast and Coffee", "Time with Shine", "Free Time and Activities",
                          "Worship and Stories from the Field", "Celebration and Fun",
                          /* Sunday, because a guest still has to pack and there
                             is breakfast to take with them. */
                          "Breakfast To Go", "Packing and Departures"]) {
        assert.match(guest.body, new RegExp(line), `the card says ${line}`);
      }

      /* The working calendar's own rows, which a guest was never handed. */
      for (const row of ["Devotional", "Gusii Land recap", "Coffee break and rope prep",
                         "favorite-things bingo", "Prayer walk", "Cornhole tournament",
                         "Partner invitation", "Get ready for worship", "Sector Sweep",
                         "Morning readiness", "bathroom"]) {
        assert.doesNotMatch(guest.body, new RegExp(row), `not on the card: ${row}`);
      }

      /* A meal still opens its menu, which is the one thing a guest taps. */
      assert.match(guest.body, /Egg and sausage bake/, "the Friday breakfast menu travels with it");
      assert.match(guest.body, /Menu/, "and the row says so");

      /* A menu reads as one voice: no roaster named, and no capital letter
         arriving in the middle of a dish. */
      assert.doesNotMatch(guest.body, /Dock Coffee/);
      assert.match(guest.body, /Fresh english muffin toast/);
      assert.match(guest.body, /brussels sprouts/);

      /* The verse the weekend is named for, at the foot of the page. */
      assert.match(guest.body, /Enlarge the place of your tent/);
      assert.match(guest.body, /Isaiah 54:2/);
    });

    /* ---------------------------------------------------- the coffee bar */

    await t.test("the coffee bar names three hot lattes, on both public surfaces", async () => {
      /* One menu, read by a guest with no account and by the team behind the
         weekend's code. Both get the same three drinks, the same lines and
         the same builds. */
      const card = [
        ["The Shine", "The most popular.", "Vanilla latte · Vanilla cold foam · Gold dust"],
        ["Honeycomb", "Rich but approachable.", "Honey brown sugar latte · Salted honey cold foam"],
        ["Northwoods", "Perfect for the cabin.", "Caramel latte · Whipped cream · Caramel drizzle"],
      ];

      /* The page carries the menu as data and draws it when the tab is
         opened, so this asserts what is served. The words around it, the
         introduction and the heading over the build, are literals in the
         component and are checked in the browser. */
      const guest = await visit(newJar(), "/shine/2026");
      assert.equal(guest.status, 200, "a guest needs no account for the menu");
      for (const [name, feel, line] of card) {
        assert.match(guest.body, new RegExp(name), name);
        assert.match(guest.body, new RegExp(feel), feel);
        assert.match(guest.body, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), line);
      }
      /* The cold foams keep their name on a hot drink, deliberately. */
      assert.match(guest.body, /Vanilla cold foam/);
      assert.match(guest.body, /Salted honey cold foam/);
      /* Nothing iced, no sizes, no prices, no fourth drink. */
      /* What the menu must not say, asked of the menu itself rather than of
         the whole document: a page carries its framework's own markers, and
         the Friday lunch has sliced tomatoes in it. */
      const { data: engagement } = await admin
        .from("engagements").select("reference")
        .eq("organization_id", (await admin.from("organizations").select("id")
          .eq("slug", "shine").single()).data!.id)
        .eq("series_slug", "founders-weekend").eq("edition_label", "2026").single();
      const reference = engagement!.reference as { guide?: { coffee?: unknown } };
      const menu = JSON.stringify(reference.guide?.coffee ?? []);

      assert.equal(JSON.parse(menu).length, 3, "three drinks, no more");
      for (const absent of [/\biced\b/i, /available cold/i, /\$[0-9]/,
                            /\bsmall\b/i, /\bmedium\b/i, /\blarge\b/i, /\bsize\b/i]) {
        assert.doesNotMatch(menu, absent, String(absent));
      }
    });

    /* ------------------------------------------------ three surfaces, apart */

    await t.test("the three SHINE surfaces stay what they are", async () => {
      /* One weekend, three audiences, and the difference between them is the
         whole point: guests get a guide with no login, the team gets an
         operational reading behind the weekend's code, and the planner gets
         the working calendar behind an account. A control that belongs to one
         of them must not appear on another, so each is asked directly. */
      const PLANNER_ONLY = [/\+<\/span> Idea/, /ev-bank-ideas/, /ev-bank-chip/, /ev-bar-add/];

      /* 1 and 2. The guest guide: public, and nothing of the planning in it. */
      const guest = await visit(newJar(), "/shine/2026");
      assert.equal(guest.status, 200, "a guest needs no account and no code");
      assert.match(guest.body, /Founders Weekend/);
      for (const control of PLANNER_ONLY) {
        assert.doesNotMatch(guest.body, control, `guest guide: ${control}`);
      }
      for (const word of ["Budget", "Run of show", "Volunteer duties", "Unschedule"]) {
        assert.doesNotMatch(guest.body, new RegExp(word), `guest guide: ${word}`);
      }

      /* 3 and 4. The team guide: the weekend's own door, and nothing of the
         planner behind it either. The code itself is never written here; the
         door is asked for and refused, which is what a stranger sees. */
      const team = await visit(newJar(), "/shine/2026/team");
      assert.equal(team.status, 200, "the door renders rather than redirecting");
      assert.match(team.body, /Welcome, SHINE Team/, "and it is the weekend's own door");
      assert.match(team.body, /Enter the team code/);
      assert.doesNotMatch(team.body, /Spark/i, "not a product nobody was told about");
      for (const control of PLANNER_ONLY) {
        assert.doesNotMatch(team.body, control, `team door: ${control}`);
      }
      /* 5. The planner, and only the planner, is offered capture. */
      const planner = await adopt(w.staff.email);
      const calendar = await visit(planner, `${A_HOME}/schedule`);
      assert.equal(calendar.status, 200);
      assert.match(calendar.body, /\+<\/span> Idea/, "capture leads the toolbar");
      assert.match(calendar.body, /\+<\/span> Moment/, "and a moment is still one press away");
      assert.match(calendar.body, /ev-bank-ideas/, "the bank is there to receive it");

      /* A client is in the same workspace and is offered neither. */
      const client = await adopt(w.client.email);
      const asClient = await visit(client, `${A_HOME}/schedule`);
      assert.equal(asClient.status, 200);
      assert.doesNotMatch(asClient.body, /\+<\/span> Idea/, "a client captures nothing");
      assert.doesNotMatch(asClient.body, /ev-bank-ideas/);
    });

    await t.test("an idea captured in the planner lands in the bank, unscheduled", async () => {
      /* The existing capture, through the existing action: a title, no day,
         no hour. What it must not do is schedule anything. */
      const planner = await adopt(w.staff.email);
      const title = `${CLEAN} captured ${RUN}`;
      const client = await clientFor(w.staff.email);
      const { error } = await client.from("sparks").insert({
        engagement_id: w.alphaId, title, status: "captured",
      });
      assert.equal(error, null, "a planner may capture");

      try {
        const calendar = await visit(planner, `${A_HOME}/schedule`);
        assert.match(calendar.body, new RegExp(title), "it is in the bank");

        const { count } = await admin
          .from("schedule_items").select("id", { count: "exact", head: true })
          .eq("engagement_id", w.alphaId).eq("title", title);
        assert.equal(count, 0, "and nothing was scheduled by capturing it");
      } finally {
        await admin.from("sparks").delete().eq("engagement_id", w.alphaId).eq("title", title);
      }
    });

    /* ------------------------------------------------------- the two domains */

    await t.test("the product's domain serves the product, and the company's is untouched", async () => {
      /* The header a proxy sets with the address somebody actually typed. */
      const onHost = (host: string) => (path: string) =>
        visit(newJar(), path, { headers: { "x-forwarded-host": host } });
      const product = onHost("tentmaiker.com");
      const company = onHost("stewardship.capital");

      /* The product's own domain: its root is TentMAiKER's page, its front
         door is /spark, and the company's homepage is nowhere on it. */
      const landing = await product("/");
      assert.equal(landing.status, 200);
      assert.match(landing.body, /<title>TENTMAiKER \| In the trade/, "the company's landing page");
      assert.doesNotMatch(landing.body, /Steward what you|Time\. Talent\. Treasure/,
        "the company's homepage is not served here");
      const front = await product("/spark");
      assert.equal(front.status, 200);
      assert.match(front.body, /Capture freely/, "the product's entry");

      /* Clean addresses reach the workspaces, and are still guarded: an
         anonymous visitor is turned away to the product's own front door,
         never to a path with /spark in it. */
      const workspace = await product("/c/shine/e/founders-weekend/2026/schedule");
      assert.equal(workspace.status, 307);
      assert.equal(workspace.location, "/spark", "refused to the product's front door");
      assert.doesNotMatch(workspace.body, /Morning readiness/);

      /* The guide keeps the address that is already printed on things. */
      assert.equal((await product("/shine/2026")).status, 200);

      /* The company's own surfaces are not served on the product's domain. */
      for (const path of ["/dashboard", "/login", "/signup", "/assessment", "/internal/operating-system"]) {
        const hit = await product(path);
        assert.equal(hit.status, 307, path);
        assert.equal(hit.location, "/spark", path);
      }

      /* Arriving through the emailed link lands on the product's own
         address, not on the path that implements it. */
      const arriving = newJar();
      const landed = await signIn(arriving, w.client.email, {
        headers: { "x-forwarded-host": "tentmaiker.com" },
      });
      assert.equal(landed.location, `/c/${A_SLUG}/e/check/2026/team`);

      /* Signed in on the product's domain, the page draws its own addresses.
         The routes underneath are unchanged, so /spark keeps working, but
         nothing a person clicks hands them the implementation path. */
      const planner = newJar();
      await signIn(planner, w.staff.email);
      const inside = await visit(planner, `${A_HOME}/schedule`, {
        headers: { "x-forwarded-host": "tentmaiker.com" },
      });
      assert.equal(inside.status, 200);
      assert.match(inside.body, new RegExp(`href="/c/${A_SLUG}/e/check/2026/budget"`),
        "the navigation is clean");
      assert.doesNotMatch(inside.body, /href="\/spark\/c\//, "and never says /spark");
      assert.doesNotMatch(inside.body, /action="\/spark\/signout"/, "including sign out");

      /* The same page on the company's domain is unchanged. */
      const onCompany = await visit(planner, `${A_HOME}/schedule`, {
        headers: { "x-forwarded-host": "stewardship.capital" },
      });
      assert.equal(onCompany.status, 200);
      assert.match(onCompany.body, new RegExp(`href="/spark/c/${A_SLUG}/e/check/2026/budget"`));

      /* And the platform console is the company's on either domain. */
      const console_ = await product("/platform");
      assert.equal(console_.status, 307);
      assert.match(console_.location ?? "", /^\/platform$/, "sent to the company's own");

      /* And the company's domain behaves exactly as it did: its homepage is
         its own, /spark still answers, and the clean addresses are not
         published there. */
      const home = await company("/");
      assert.equal(home.status, 200);
      assert.doesNotMatch(home.body, /Capture freely/, "the company homepage, not the product");
      assert.equal((await company("/spark")).status, 200);
      assert.equal((await company("/shine/2026")).status, 200);
      assert.equal((await company("/c/shine")).status, 404, "clean addresses belong to the product");
      assert.equal((await company("/tentmaiker")).status, 404, "the landing page has one address");
    });

    /* -------------------------------------------------- the weekend's code */

    await t.test("the weekend's code opens the team guide, and only that", async () => {
      const SHORT = "/shine/2026";
      const SHINE = "/spark/c/shine/e/founders-weekend/2026";
      /* The code is never written down here either: this is its hash, which
         is the only form the database ever sees. */
      const CODE_HASH = "331e5f5ebf68fd8615720d980e06af87609bd9beccf4a83fbfcdbb5be24166a1";

      const open = async (hash: string, caller: string) => {
        const { data } = await admin.rpc("open_event_session", {
          p_client: "shine", p_series: "founders-weekend", p_edition: "2026",
          p_code_hash: hash, p_client_hash: caller,
        });
        return data as string | null;
      };

      assert.equal(await open("not-the-code", `${RUN}-wrong`), null, "a wrong code opens nothing");

      const token = await open(CODE_HASH, `${RUN}-right`);
      assert.ok(token && token.length >= 32, "the right code returns a session");

      try {
        const jar = newJar();
        jar.set("shine_team", { value: token!, persistent: true });

        /* It opens the team guide: the page carries the team only rows and
           the operational detail that the door does not. */
        const team = await visit(jar, `${SHORT}/team`);
        assert.equal(team.status, 200);
        assert.doesNotMatch(team.body, /Welcome, SHINE Team/, "past the door");
        assert.match(team.body, /Morning bathroom cleaning/, "a team only row");
        assert.match(team.body, /Wipe countertops/, "the operational detail");

        /* And none of the planner's controls: the team executes the weekend,
           it does not plan it. */
        for (const control of [/\+<\/span> Idea/, /ev-bank-ideas/, /ev-bank-chip/, /ev-bar-add/,
                               /Add to weekend/, /Delete idea/, /Set aside/]) {
          assert.doesNotMatch(team.body, control, `team guide: ${control}`);
        }

        /* Without the cookie, the same address has none of it. */
        const closed = await visit(newJar(), `${SHORT}/team`);
        assert.match(closed.body, /Welcome, SHINE Team/);
        assert.doesNotMatch(closed.body, /Morning bathroom cleaning/);

        /* And nothing else. Not the calendar, not the budget, not the
           workspace, not another client, not the platform. */
        for (const path of [`${SHINE}/schedule`, `${SHINE}/budget`, `${SHINE}/plan`,
                            "/spark/c/shine", `${SHORT}/schedule`]) {
          const hit = await visit(jar, path);
          assert.notEqual(hit.status, 200, path);
        }

        /* The platform home renders its own door to a stranger, and the code
           does not make the holder any less of a stranger there. */
        const platform = await visit(jar, PLATFORM);
        assert.doesNotMatch(platform.body, /Morning bathroom cleaning/);
        assert.doesNotMatch(platform.body, /Founders Weekend/);

        /* The cookie is scoped to the guide, so it is not even sent to Spark. */
        const entry = await visit(jar, ENTRY);
        assert.doesNotMatch(entry.body, /Run of show/);
      } finally {
        /* By the client that owns it. A copy of SHINE made for a check
           elsewhere shares its series and edition, so those two do not
           identify the engagement on their own. */
        const { data: owner } = await admin.from("organizations")
          .select("id").eq("slug", "shine").single();
        const { data: real } = await admin.from("engagements")
          .select("id").eq("organization_id", owner!.id)
          .eq("series_slug", "founders-weekend").eq("edition_label", "2026").single();
        await admin.from("event_sessions").delete().eq("engagement_id", real!.id);
        await admin.from("event_code_attempts").delete().like("client_hash", `${RUN}%`);
      }
    });

    /* ---------------------------------------------------- the weekend guide */

    await t.test("a published guide is open to anyone, and carries nothing internal", async () => {
      const [confirmed] = (await admin
        .from("schedule_items")
        .select("id")
        .eq("engagement_id", w.alphaId)
        .eq("status", "confirmed")).data ?? [];
      assert.ok(confirmed, "the confirmed moment exists");
      await admin.from("schedule_item_ops").insert({
        schedule_item_id: confirmed.id,
        engagement_id: w.alphaId,
        detail: { notes: `${CLEAN} internal note`, owner: `${CLEAN} owner` },
      });
      await admin.from("engagements").update({ reference: { guide: { public: true } } }).eq("id", w.alphaId);

      try {
        const anon = newJar();
        const guest = await visit(anon, A_HOME);
        assert.equal(guest.status, 200, "no account needed");
        assert.match(guest.body, new RegExp(`${CLEAN} confirmed`));
        for (const secret of [`${CLEAN} draft`, `${CLEAN} cue`, `${CLEAN} internal note`, `${CLEAN} owner`]) {
          assert.doesNotMatch(guest.body, new RegExp(secret), secret);
        }

        /* Publishing opens the root and nothing beneath it. The team address
           is navigation, not permission. */
        for (const section of ["/team", "/schedule", "/budget", "/plan", "/actions"]) {
          const hit = await visit(anon, `${A_HOME}${section}`);
          assert.equal(hit.status, 307, section);
          assert.equal(hit.location, ENTRY, section);
        }

        /* Nor does the database hand the team detail to an anonymous key. */
        const { data: ops } = await anonClient().from("schedule_item_ops").select("detail");
        assert.equal((ops ?? []).length, 0);

        /* One calendar, two readings: a time changed once shows in both. */
        await admin.from("schedule_items").update({ starts_label: "4:15 pm" }).eq("id", confirmed.id);
        assert.match((await visit(anon, A_HOME)).body, /4:15/);
        const team = await visit(await adopt(w.client.email), `${A_HOME}/team`);
        assert.equal(team.status, 200);
        assert.match(team.body, /4:15/);
        assert.match(team.body, new RegExp(`${CLEAN} internal note`), "the team reads the detail");
      } finally {
        await admin.from("schedule_items").update({ starts_label: "3:00 pm" }).eq("id", confirmed.id);
        await admin.from("schedule_item_ops").delete().eq("schedule_item_id", confirmed.id);
        await admin.from("engagements").update({ reference: {} }).eq("id", w.alphaId);
      }

      assert.equal((await visit(newJar(), A_HOME)).location, ENTRY, "unpublishing closes it again");
    });

    /* -------------------------------------------------------- invitations */

    await t.test("a malformed or forged invitation fails safely", async () => {
      for (const token of ["nope", "../../etc/passwd", "a".repeat(31), randomInvitationToken()]) {
        const jar = newJar();
        const hit = await visit(jar, `/spark/i/${encodeURIComponent(token)}`);
        assert.equal(hit.status, 307, token);
        assert.equal(hit.location, ENTRY, token);
        assert.equal(jar.size, 0, "a token that grants nothing sets nothing");
      }
    });

    await t.test("an expired invitation fails, and looks like every other failure", async () => {
      const token = await invitation(w.alphaId, w.invitee.email, "client", { expired: true });
      const jar = newJar();
      const hit = await visit(jar, `/spark/i/${token}`);
      assert.equal(hit.location, ENTRY);
      assert.equal(jar.size, 0);
    });

    await t.test("an invitation cannot be redeemed by another address, and survives the attempt", async () => {
      const token = await invitation(w.alphaId, w.invitee.email, "client");
      const hash = await hashInvitationToken(token);

      const wrongPerson = await clientFor(w.stranger.email);
      const { data } = await wrongPerson.rpc("accept_invitation", { p_token_hash: hash });
      assert.equal(data?.ok, false, "the invited address is the only one that can accept");

      const { data: row } = await admin
        .from("invitations")
        .select("accepted_at")
        .eq("token_hash", hash)
        .single();
      assert.equal(row?.accepted_at, null, "a wrong attempt must not consume the invitation");

      const { count } = await admin
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", w.stranger.id);
      assert.equal(count, 0, "the failed attempt granted nothing");
    });

    await t.test("a valid invitation, accepted by the invited address, becomes membership", async () => {
      const token = await invitation(w.alphaId, w.invitee.email, "client");

      const jar = await adopt(w.invitee.email);
      /* Signed in but not yet a member of anything. */
      assert.equal((await visit(jar, A_HOME)).location, ENTRY);

      const accepted = await visit(jar, `/spark/i/${token}`);
      assert.equal(accepted.status, 307);
      assert.equal(accepted.location, `${A_HOME}/team`, "acceptance lands in the workspace");
      assert.equal((await visit(jar, A_HOME)).status, 200);

      const { data: row } = await admin
        .from("invitations")
        .select("accepted_at, accepted_by")
        .eq("token_hash", await hashInvitationToken(token))
        .single();
      assert.ok(row?.accepted_at, "acceptance is recorded");
      assert.equal(row?.accepted_by, w.invitee.id);
    });

    await t.test("an accepted invitation cannot be used again", async () => {
      const token = await invitation(w.alphaId, w.invitee.email, "planner");
      const hash = await hashInvitationToken(token);

      const invitee = await clientFor(w.invitee.email);
      const first = await invitee.rpc("accept_invitation", { p_token_hash: hash });
      assert.equal(first.data?.ok, true);

      const second = await invitee.rpc("accept_invitation", { p_token_hash: hash });
      assert.equal(second.data?.ok, false, "single use means once");

      /* And the link is dead for everyone, not just for that caller. */
      const jar = newJar();
      const hit = await visit(jar, `/spark/i/${token}`);
      assert.equal(hit.location, ENTRY);
    });

    await t.test("the invitation token is never the session", async () => {
      const token = await invitation(w.betaId, `fresh@${TEST_DOMAIN}`, "client");
      const jar = newJar();

      await visit(jar, `/spark/i/${token}`);
      /* Whatever the route did with the link, holding it is not being signed
         in: the workspace it names is still refused. */
      const hit = await visit(jar, B_HOME);
      assert.equal(hit.status, 307);
      assert.equal(hit.location, ENTRY);
    });

    await t.test("only the hash of a token is ever stored", async () => {
      const token = await invitation(w.alphaId, `hashcheck@${TEST_DOMAIN}`, "client");
      const { data } = await admin
        .from("invitations")
        .select("token_hash")
        .eq("token_hash", await hashInvitationToken(token))
        .single();

      assert.ok(data);
      assert.notEqual(data!.token_hash, token);
      assert.doesNotMatch(String(data!.token_hash), new RegExp(token));
    });

    /* -------------------------------------------- sessions and revocation */

    await t.test("the session survives closing the browser", async () => {
      const jar = await adopt(w.client.email);
      assert.equal((await visit(jar, A_HOME)).status, 200);

      const reopened = restartBrowser(jar);
      assert.ok(reopened.size > 0, "something persistent was kept");

      const hit = await visit(reopened, A_HOME);
      assert.equal(hit.status, 200, "no fresh code needed on the next visit");
      assert.equal((await visit(reopened, ENTRY)).location, `${A_HOME}/team`);
    });

    await t.test("an expired access token refreshes itself, silently", async () => {
      const jar = await adopt(w.client.email);
      const before = accessTokenOf(jar);
      assert.ok(before, "the jar is carrying an access token");

      assert.ok(
        expireAccessToken(jar),
        "could not age the session cookie; the format may have changed",
      );

      /* The access token is now past its expiry. The refresh token is not, so
         this should go through without anyone being asked for a code. */
      const hit = await visit(jar, A_HOME);
      assert.equal(hit.status, 200, "an hour later is still signed in");

      const after = accessTokenOf(jar);
      assert.ok(after, "a session is still in the jar");
      assert.notEqual(after, before, "and it is a freshly issued one");
    });

    await t.test("session cookies are not readable by page scripts", async () => {
      const response = await fetch(
        `${BASE_URL}/spark/auth/callback?token_hash=${
          (await linkFor(w.client.email)).tokenHash
        }&type=magiclink`,
        { redirect: "manual" },
      );
      const authCookies = response.headers
        .getSetCookie()
        .filter((line) => line.startsWith("sb-"));

      assert.ok(authCookies.length > 0, "the session was written as cookies");
      for (const line of authCookies) {
        const name = line.split("=")[0];
        /* The library ships httpOnly false so a browser side client can read
           the session. Spark has no browser side client, so it is turned off. */
        assert.match(line, /HttpOnly/i, name);
        assert.match(line, /SameSite=lax/i, name);
        /* Persistent, or closing the browser would mean verifying again. */
        const maxAge = /Max-Age=(\d+)/i.exec(line);
        assert.ok(maxAge, `${name} has no Max-Age`);
        assert.ok(Number(maxAge![1]) > 30 * 24 * 60 * 60, `${name} expires too soon`);
      }
    });

    await t.test("a forged or malformed session fails closed", async () => {
      for (const forged of ["not-a-token", "eyJhbGciOiJIUzI1NiJ9.e30.x", ""]) {
        const jar = newJar();
        jar.set("sb-access-token", { value: forged, persistent: true });
        jar.set("sb-refresh-token", { value: forged, persistent: true });

        const hit = await visit(jar, A_HOME);
        assert.equal(hit.status, 307, forged);
        assert.equal(hit.location, ENTRY, forged);
      }
    });

    await t.test("signing out actually removes access", async () => {
      /* Its own identity: signing out revokes every refresh token this person
         holds, which would pull the session out from under the other tests. */
      const jar = newJar();
      await signIn(jar, w.leaver.email);
      assert.equal((await visit(jar, A_HOME)).status, 200);

      /* Leaving by the platform's door lands on the platform's door, which
         signed out is the sign in and nothing more. */
      const out = await visit(jar, "/spark/signout", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "next=%2Fplatform",
      });
      assert.equal(out.location, PLATFORM);
      const door = await visit(jar, PLATFORM);
      assert.equal(door.status, 200);
      assert.match(door.body, /Sign in to continue/);

      const after = await visit(jar, A_HOME);
      assert.equal(after.status, 307);
      assert.equal(after.location, ENTRY);

      /* And it does not come back by reopening the browser. */
      assert.equal((await visit(restartBrowser(jar), A_HOME)).location, ENTRY);

      /* A door the form did not name is not a door. */
      const jar2 = newJar();
      const elsewhere = await visit(jar2, "/spark/signout", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "next=%2Fdashboard",
      });
      assert.equal(elsewhere.location, ENTRY);
    });

    await t.test("revoking membership locks someone out while their session is still valid", async () => {
      const jar = await adopt(w.guest.email);
      const home = A_HOME;
      assert.equal((await visit(jar, home)).status, 200);

      await admin
        .from("workspace_members")
        .delete()
        .eq("user_id", w.guest.id)
        .eq("engagement_id", w.alphaId);

      /* No sign out, no expiry, no waiting. The next request asks the
         database again and the answer has changed. */
      const after = await visit(jar, home);
      assert.equal(after.status, 307);
      assert.equal(after.location, ENTRY);

      /* The identity is still perfectly good, which is the point: what was
         withdrawn was the engagement, not the person. */
      const entry = await visit(jar, ENTRY);
      assert.match(entry.body, /invitation only/i, "still signed in, now a member of nothing");

      await admin.from("workspace_members").insert({
        engagement_id: w.alphaId,
        user_id: w.guest.id,
        role: "stakeholder",
      });
      assert.equal((await visit(jar, home)).status, 200, "restoring it restores access");
    });

    /* -------------------------------------- row level security, underneath */

    await t.test("cross client reads are blocked at the data layer", async () => {
      const supabase = await clientFor(w.client.email);

      const { data: sparks } = await supabase.from("sparks").select("id, engagement_id");
      assert.equal(sparks?.some((row) => row.engagement_id === w.betaId), false);
      assert.equal(sparks?.every((row) => row.engagement_id === w.alphaId), true);

      const { data: engagements } = await supabase.from("engagements").select("id");
      assert.deepEqual(engagements?.map((row) => row.id), [w.alphaId]);

      const { data: invitations } = await supabase.from("invitations").select("id");
      assert.equal(invitations?.length ?? 0, 0, "clients never see the invitation list");
    });

    await t.test("cross client writes affect zero rows", async () => {
      const supabase = await clientFor(w.client.email);

      const { data: updated } = await supabase
        .from("sparks")
        .update({ title: "taken over" })
        .eq("id", w.betaSparkId)
        .select();
      assert.equal(updated?.length ?? 0, 0, "measured by rows affected, not by absence of an error");

      const { data: deleted } = await supabase
        .from("sparks")
        .delete()
        .eq("id", w.betaSparkId)
        .select();
      assert.equal(deleted?.length ?? 0, 0);

      /* And the row is genuinely still there. */
      const { data: still } = await admin
        .from("sparks")
        .select("title")
        .eq("id", w.betaSparkId)
        .single();
      assert.equal(still?.title, `${CLEAN} beta`);
    });

    await t.test("a client cannot promote themselves", async () => {
      const supabase = await clientFor(w.client.email);

      const { data: promoted } = await supabase
        .from("workspace_members")
        .update({ role: "planner" })
        .eq("user_id", w.client.id)
        .select();
      assert.equal(promoted?.length ?? 0, 0);

      const { error: inserted } = await supabase
        .from("workspace_members")
        .insert({ engagement_id: w.betaId, user_id: w.client.id, role: "planner" })
        .select();
      assert.ok(inserted, "inserting a membership is refused outright");

      const { data: role } = await admin
        .from("workspace_members")
        .select("role")
        .eq("user_id", w.client.id)
        .eq("engagement_id", w.alphaId)
        .single();
      assert.equal(role?.role, "client", "still exactly what they were");
    });

    await t.test("a client cannot perform planner only operational writes", async () => {
      const supabase = await clientFor(w.client.email);

      const { error: schedule } = await supabase.from("schedule_items").insert({
        engagement_id: w.alphaId,
        day_key: "sat",
        starts_label: "9:00 am",
        title: `${CLEAN} intrusion`,
        track: "Program",
      });
      assert.ok(schedule, "the schedule belongs to the planner");

      const { error: budget } = await supabase.from("budget_lines").insert({
        engagement_id: w.alphaId,
        category: "Venue and lodging",
        label: `${CLEAN} intrusion`,
        planned_cents: 1,
      });
      assert.ok(budget, "the budget belongs to the planner");

      const { data: approved } = await supabase
        .from("sparks")
        .update({ status: "approved" })
        .eq("id", w.alphaSparkId)
        .select();
      assert.equal(approved?.length ?? 0, 0, "approving is not the client's to do");
    });

    await t.test("a planner can do what the client could not", async () => {
      const supabase = await clientFor(w.staff.email);

      const { data: approved } = await supabase
        .from("sparks")
        .update({ status: "approved" })
        .eq("id", w.alphaSparkId)
        .select();
      assert.equal(approved?.length, 1, "measured by rows affected");

      await admin.from("sparks").update({ status: "captured" }).eq("id", w.alphaSparkId);
    });

    await t.test("a guest sees the confirmed schedule and nothing else", async () => {
      const supabase = await clientFor(w.guest.email);

      const { data: schedule } = await supabase
        .from("schedule_items")
        .select("title, status")
        .like("title", `${CLEAN}%`);
      assert.equal(schedule?.length, 1, "one confirmed item, not the draft");
      assert.equal(schedule?.[0].status, "confirmed");

      const { data: sparks } = await supabase.from("sparks").select("id");
      assert.equal(sparks?.length ?? 0, 0, "the discussion is not the guest's to read");

      const { data: budget } = await supabase.from("budget_lines").select("id");
      assert.equal(budget?.length ?? 0, 0);

      const { data: cues } = await supabase.from("run_of_show_cues").select("id");
      assert.equal(cues?.length ?? 0, 0, "the run of show is planner only");
    });

    await t.test("the run of show stays planner only, including from the client", async () => {
      const asClient = await clientFor(w.client.email);
      const { data: cues } = await asClient.from("run_of_show_cues").select("id");
      assert.equal(cues?.length ?? 0, 0);

      const asPlanner = await clientFor(w.staff.email);
      const { data: seen } = await asPlanner
        .from("run_of_show_cues")
        .select("id")
        .like("cue", `${CLEAN}%`);
      assert.equal(seen?.length, 1);
    });

    await t.test("staff access is explicit, and reaches both clients", async () => {
      const supabase = await clientFor(w.staff.email);
      const { data } = await supabase.rpc("my_access");

      assert.equal(data.staff, true);
      const engagements = data.workspaces.map((row: { engagement_id: string }) => row.engagement_id);
      assert.ok(engagements.includes(w.alphaId));

      const { data: orgs } = await supabase.from("organizations").select("slug");
      const slugs = orgs?.map((row) => row.slug) ?? [];
      assert.ok(slugs.includes(A_SLUG));
      assert.ok(slugs.includes(B_SLUG));

      /* Nobody else has it. */
      const asClient = await clientFor(w.client.email);
      const { data: clientAccess } = await asClient.rpc("my_access");
      assert.equal(clientAccess.staff, false);
    });
  } finally {
    await tearDown(world);
  }
});
