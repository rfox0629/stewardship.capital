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

const SHINE_HOME = "/spark/c/shine/e/founders-weekend/2026";
const CHECK_HOME = "/spark/c/auth-check-client/e/check/2027";
const PLATFORM = "/spark/platform";
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
  shineId: string;
  checkId: string;
  shineSparkId: string;
  checkSparkId: string;
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

  const { data: shine } = await admin
    .from("engagements")
    .select("id")
    .eq("slug", "founders-weekend-2026")
    .single();
  if (!shine) throw new Error("the SHINE seed is missing from this database");
  const shineId = shine.id as string;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ slug: "auth-check-client", name: "Auth Check Client" })
    .select("id")
    .single();
  if (orgError || !org) throw new Error(`could not seed a second client: ${orgError?.message}`);

  const { data: check, error: checkError } = await admin
    .from("engagements")
    .insert({
      organization_id: org.id,
      slug: "check-2027",
      name: "Check Retreat 2027",
      series_slug: "check",
      edition_label: "2027",
    })
    .select("id")
    .single();
  if (checkError || !check) throw new Error(`could not seed a second engagement: ${checkError?.message}`);
  const checkId = check.id as string;

  await admin.from("platform_staff").insert({ user_id: staff.id });
  await admin.from("workspace_members").insert([
    { engagement_id: shineId, user_id: staff.id, role: "planner" },
    { engagement_id: shineId, user_id: client.id, role: "client" },
    { engagement_id: shineId, user_id: guest.id, role: "stakeholder" },
    { engagement_id: shineId, user_id: multi.id, role: "client" },
    { engagement_id: checkId, user_id: otherPlanner.id, role: "planner" },
    { engagement_id: checkId, user_id: multi.id, role: "client" },
    { engagement_id: shineId, user_id: leaver.id, role: "client" },
  ]);

  const { data: sparks } = await admin
    .from("sparks")
    .insert([
      { engagement_id: shineId, title: `${CLEAN} shine`, category: "Experience" },
      { engagement_id: checkId, title: `${CLEAN} check`, category: "Experience" },
    ])
    .select("id, engagement_id");

  await admin.from("budget_lines").insert([
    { engagement_id: shineId, category: "Venue and lodging", label: `${CLEAN} shine`, planned_cents: 1000 },
    { engagement_id: checkId, category: "Venue and lodging", label: `${CLEAN} check`, planned_cents: 1000 },
  ]);

  const { data: items } = await admin
    .from("schedule_items")
    .insert([
      { engagement_id: shineId, day_key: "thu", starts_label: "3:00 pm", title: `${CLEAN} confirmed`, track: "Hospitality", status: "confirmed" },
      { engagement_id: shineId, day_key: "fri", starts_label: "8:45 am", title: `${CLEAN} draft`, track: "Program", status: "draft" },
    ])
    .select("id");

  await admin.from("run_of_show_cues").insert({
    engagement_id: shineId,
    schedule_item_id: items![0].id,
    at_label: "3:00 pm",
    cue: `${CLEAN} cue`,
  });

  return {
    staff, client, guest, otherPlanner, stranger, invitee, multi, leaver,
    shineId,
    checkId,
    shineSparkId: sparks!.find((s) => s.engagement_id === shineId)!.id,
    checkSparkId: sparks!.find((s) => s.engagement_id === checkId)!.id,
  };
};

const tearDown = async (world: World | null) => {
  await admin.from("invitations").delete().like("email", `%@${TEST_DOMAIN}`);
  if (world) {
    await admin.from("run_of_show_cues").delete().like("cue", `${CLEAN}%`);
    await admin.from("schedule_items").delete().like("title", `${CLEAN}%`);
    await admin.from("budget_lines").delete().like("label", `${CLEAN}%`);
    await admin.from("sparks").delete().like("title", `${CLEAN}%`);
    await admin.from("organizations").delete().eq("slug", "auth-check-client");

    for (const person of [
      world.staff, world.client, world.guest, world.otherPlanner,
      world.stranger, world.invitee, world.multi, world.leaver,
    ]) {
      await admin.auth.admin.deleteUser(person.id).catch(() => {});
    }
  }

  /* Anyone the app created along the way, for example by following an
     invitation link that had never been signed in to before. */
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
      for (const path of [SHINE_HOME, `${SHINE_HOME}/budget`, CHECK_HOME, PLATFORM, "/spark/c/shine"]) {
        const hit = await visit(newJar(), path);
        assert.equal(hit.status, 307, path);
        assert.equal(hit.location, ENTRY, path);
      }
    });

    await t.test("the front door is reachable, and says only what it should", async () => {
      const hit = await visit(newJar(), ENTRY);
      assert.equal(hit.status, 200);
      assert.match(hit.body, /Capture freely\. Discern carefully\. Move intentionally\./);
      assert.match(hit.body, /Spark/);
      /* Universal on purpose. No client is named on the way in. */
      assert.doesNotMatch(hit.body, /SHINE|Founders Weekend|Auth Check/i);
    });

    await t.test("the old addresses still lead to Spark", async () => {
      const moved: Array<[string, string]> = [
        ["/more", ENTRY],
        ["/events-os", ENTRY],
        ["/events-os/c/shine/e/founders-weekend/2026", SHINE_HOME],
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

    await t.test("the homepage sends people to Spark, not to /more", async () => {
      const hit = await visit(newJar(), "/");
      assert.equal(hit.status, 200);
      assert.match(hit.body, /href="\/spark"/);
      assert.match(hit.body, /Time\.|Talent\.|Treasure\./);
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

      const hit = await visit(jar, SHINE_HOME);
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
      assert.equal(landed.location, SHINE_HOME);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.location, SHINE_HOME, "returning goes straight back in");
    });

    await t.test("several memberships offer only that person's own", async () => {
      const jar = newJar();
      const landed = await signIn(jar, w.multi.email);
      assert.equal(landed.location, ENTRY);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.status, 200);
      assert.match(entry.body, /SHINE/);
      assert.match(entry.body, /Auth Check Client/);
      /* The selector is a list of memberships, never a list of clients. */
      assert.doesNotMatch(entry.body, /Redeemer/i);
    });

    await t.test("no memberships is a quiet refusal, not an explanation", async () => {
      const jar = newJar();
      await signIn(jar, w.stranger.email);

      const entry = await visit(jar, ENTRY);
      assert.equal(entry.status, 200);
      assert.match(entry.body, /invitation only/i);
      assert.doesNotMatch(entry.body, /SHINE|Auth Check|Founders Weekend/i);

      const blocked = await visit(jar, SHINE_HOME);
      assert.equal(blocked.location, ENTRY);
    });

    await t.test("platform staff land on the platform home", async () => {
      const jar = newJar();
      const landed = await signIn(jar, w.staff.email);
      assert.equal(landed.location, PLATFORM);
      assert.equal((await visit(jar, PLATFORM)).status, 200);
    });

    /* --------------------------------------------- direct URLs and roles */

    await t.test("a direct workspace URL for another client is refused", async () => {
      const jar = await adopt(w.client.email);

      for (const path of [CHECK_HOME, `${CHECK_HOME}/budget`, "/spark/c/auth-check-client"]) {
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
      const own = await visit(jar, CHECK_HOME);
      assert.notEqual(own.location, ENTRY, "authorized, whatever the screen finds");
      assert.ok([200, 404].includes(own.status), `unexpected ${own.status}`);

      assert.equal((await visit(jar, PLATFORM)).location, ENTRY);
      assert.equal((await visit(jar, SHINE_HOME)).location, ENTRY);
    });

    await t.test("a guest reaches their own workspace", async () => {
      const jar = await adopt(w.guest.email);
      assert.equal((await visit(jar, SHINE_HOME)).status, 200);
      assert.equal((await visit(jar, PLATFORM)).location, ENTRY);
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
      const token = await invitation(w.shineId, w.invitee.email, "client", { expired: true });
      const jar = newJar();
      const hit = await visit(jar, `/spark/i/${token}`);
      assert.equal(hit.location, ENTRY);
      assert.equal(jar.size, 0);
    });

    await t.test("an invitation cannot be redeemed by another address, and survives the attempt", async () => {
      const token = await invitation(w.shineId, w.invitee.email, "client");
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
      const token = await invitation(w.shineId, w.invitee.email, "client");

      const jar = await adopt(w.invitee.email);
      /* Signed in but not yet a member of anything. */
      assert.equal((await visit(jar, SHINE_HOME)).location, ENTRY);

      const accepted = await visit(jar, `/spark/i/${token}`);
      assert.equal(accepted.status, 307);
      assert.equal(accepted.location, SHINE_HOME, "acceptance lands in the workspace");
      assert.equal((await visit(jar, SHINE_HOME)).status, 200);

      const { data: row } = await admin
        .from("invitations")
        .select("accepted_at, accepted_by")
        .eq("token_hash", await hashInvitationToken(token))
        .single();
      assert.ok(row?.accepted_at, "acceptance is recorded");
      assert.equal(row?.accepted_by, w.invitee.id);
    });

    await t.test("an accepted invitation cannot be used again", async () => {
      const token = await invitation(w.shineId, w.invitee.email, "planner");
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
      const token = await invitation(w.checkId, `fresh@${TEST_DOMAIN}`, "client");
      const jar = newJar();

      await visit(jar, `/spark/i/${token}`);
      /* Whatever the route did with the link, holding it is not being signed
         in: the workspace it names is still refused. */
      const hit = await visit(jar, CHECK_HOME);
      assert.equal(hit.status, 307);
      assert.equal(hit.location, ENTRY);
    });

    await t.test("only the hash of a token is ever stored", async () => {
      const token = await invitation(w.shineId, `hashcheck@${TEST_DOMAIN}`, "client");
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
      assert.equal((await visit(jar, SHINE_HOME)).status, 200);

      const reopened = restartBrowser(jar);
      assert.ok(reopened.size > 0, "something persistent was kept");

      const hit = await visit(reopened, SHINE_HOME);
      assert.equal(hit.status, 200, "no fresh code needed on the next visit");
      assert.equal((await visit(reopened, ENTRY)).location, SHINE_HOME);
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
      const hit = await visit(jar, SHINE_HOME);
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

        const hit = await visit(jar, SHINE_HOME);
        assert.equal(hit.status, 307, forged);
        assert.equal(hit.location, ENTRY, forged);
      }
    });

    await t.test("signing out actually removes access", async () => {
      /* Its own identity: signing out revokes every refresh token this person
         holds, which would pull the session out from under the other tests. */
      const jar = newJar();
      await signIn(jar, w.leaver.email);
      assert.equal((await visit(jar, SHINE_HOME)).status, 200);

      const out = await visit(jar, "/spark/signout", { method: "POST" });
      assert.equal(out.location, ENTRY);

      const after = await visit(jar, SHINE_HOME);
      assert.equal(after.status, 307);
      assert.equal(after.location, ENTRY);

      /* And it does not come back by reopening the browser. */
      assert.equal((await visit(restartBrowser(jar), SHINE_HOME)).location, ENTRY);
    });

    await t.test("revoking membership locks someone out while their session is still valid", async () => {
      const jar = await adopt(w.guest.email);
      assert.equal((await visit(jar, SHINE_HOME)).status, 200);

      await admin
        .from("workspace_members")
        .delete()
        .eq("user_id", w.guest.id)
        .eq("engagement_id", w.shineId);

      /* No sign out, no expiry, no waiting. The next request asks the
         database again and the answer has changed. */
      const after = await visit(jar, SHINE_HOME);
      assert.equal(after.status, 307);
      assert.equal(after.location, ENTRY);

      /* The identity is still perfectly good, which is the point: what was
         withdrawn was the engagement, not the person. */
      const entry = await visit(jar, ENTRY);
      assert.match(entry.body, /invitation only/i, "still signed in, now a member of nothing");

      await admin.from("workspace_members").insert({
        engagement_id: w.shineId,
        user_id: w.guest.id,
        role: "stakeholder",
      });
      assert.equal((await visit(jar, SHINE_HOME)).status, 200, "restoring it restores access");
    });

    /* -------------------------------------- row level security, underneath */

    await t.test("cross client reads are blocked at the data layer", async () => {
      const supabase = await clientFor(w.client.email);

      const { data: sparks } = await supabase.from("sparks").select("id, engagement_id");
      assert.equal(sparks?.some((row) => row.engagement_id === w.checkId), false);
      assert.equal(sparks?.every((row) => row.engagement_id === w.shineId), true);

      const { data: engagements } = await supabase.from("engagements").select("id");
      assert.deepEqual(engagements?.map((row) => row.id), [w.shineId]);

      const { data: invitations } = await supabase.from("invitations").select("id");
      assert.equal(invitations?.length ?? 0, 0, "clients never see the invitation list");
    });

    await t.test("cross client writes affect zero rows", async () => {
      const supabase = await clientFor(w.client.email);

      const { data: updated } = await supabase
        .from("sparks")
        .update({ title: "taken over" })
        .eq("id", w.checkSparkId)
        .select();
      assert.equal(updated?.length ?? 0, 0, "measured by rows affected, not by absence of an error");

      const { data: deleted } = await supabase
        .from("sparks")
        .delete()
        .eq("id", w.checkSparkId)
        .select();
      assert.equal(deleted?.length ?? 0, 0);

      /* And the row is genuinely still there. */
      const { data: still } = await admin
        .from("sparks")
        .select("title")
        .eq("id", w.checkSparkId)
        .single();
      assert.equal(still?.title, `${CLEAN} check`);
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
        .insert({ engagement_id: w.checkId, user_id: w.client.id, role: "planner" })
        .select();
      assert.ok(inserted, "inserting a membership is refused outright");

      const { data: role } = await admin
        .from("workspace_members")
        .select("role")
        .eq("user_id", w.client.id)
        .eq("engagement_id", w.shineId)
        .single();
      assert.equal(role?.role, "client", "still exactly what they were");
    });

    await t.test("a client cannot perform planner only operational writes", async () => {
      const supabase = await clientFor(w.client.email);

      const { error: schedule } = await supabase.from("schedule_items").insert({
        engagement_id: w.shineId,
        day_key: "sat",
        starts_label: "9:00 am",
        title: `${CLEAN} intrusion`,
        track: "Program",
      });
      assert.ok(schedule, "the schedule belongs to the planner");

      const { error: budget } = await supabase.from("budget_lines").insert({
        engagement_id: w.shineId,
        category: "Venue and lodging",
        label: `${CLEAN} intrusion`,
        planned_cents: 1,
      });
      assert.ok(budget, "the budget belongs to the planner");

      const { data: approved } = await supabase
        .from("sparks")
        .update({ status: "approved" })
        .eq("id", w.shineSparkId)
        .select();
      assert.equal(approved?.length ?? 0, 0, "approving is not the client's to do");
    });

    await t.test("a planner can do what the client could not", async () => {
      const supabase = await clientFor(w.staff.email);

      const { data: approved } = await supabase
        .from("sparks")
        .update({ status: "approved" })
        .eq("id", w.shineSparkId)
        .select();
      assert.equal(approved?.length, 1, "measured by rows affected");

      await admin.from("sparks").update({ status: "captured" }).eq("id", w.shineSparkId);
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
      assert.ok(engagements.includes(w.shineId));

      const { data: orgs } = await supabase.from("organizations").select("slug");
      const slugs = orgs?.map((row) => row.slug) ?? [];
      assert.ok(slugs.includes("shine"));
      assert.ok(slugs.includes("auth-check-client"));

      /* Nobody else has it. */
      const asClient = await clientFor(w.client.email);
      const { data: clientAccess } = await asClient.rpc("my_access");
      assert.equal(clientAccess.staff, false);
    });
  } finally {
    await tearDown(world);
  }
});
