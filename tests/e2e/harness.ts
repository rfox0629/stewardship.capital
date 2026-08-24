import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The plumbing the access tests need, and nothing they assert with.
 *
 * A cookie jar rather than a browser, because what is being tested is what the
 * server does with cookies, and a real jar makes "close the browser and come
 * back" something the test can actually perform rather than describe.
 */

export const BASE_URL = process.env.SPARK_BASE_URL ?? "http://127.0.0.1:3100";
export const TEST_DOMAIN = "auth-check.invalid";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!url || !serviceRole || !publishable) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------ cookie jar */

export type Cookie = { value: string; persistent: boolean };
export type Jar = Map<string, Cookie>;

export const newJar = (): Jar => new Map();

const absorb = (jar: Jar, response: Response) => {
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...attrs] = line.split(";");
    const index = pair.indexOf("=");
    if (index < 0) continue;

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();

    const lowered = attrs.map((attr) => attr.trim().toLowerCase());
    const maxAge = lowered.find((attr) => attr.startsWith("max-age="));
    const expires = lowered.find((attr) => attr.startsWith("expires="));

    /* Cleared by the server, so drop it rather than keep an empty value that
       would read as "still signed in" to the next request. */
    if (value === "" || maxAge === "max-age=0") {
      jar.delete(name);
      continue;
    }

    jar.set(name, { value, persistent: Boolean(maxAge || expires) });
  }
};

const serialise = (jar: Jar) =>
  Array.from(jar.entries())
    .map(([name, cookie]) => `${name}=${cookie.value}`)
    .join("; ");

/**
 * Quitting the browser. Session cookies go; the ones the server asked the
 * browser to keep, stay. Whether Spark survives this is the whole of the
 * persistent session requirement.
 */
export const restartBrowser = (jar: Jar): Jar => {
  const kept = newJar();
  for (const [name, cookie] of jar) {
    if (cookie.persistent) kept.set(name, cookie);
  }
  return kept;
};

export type Hit = {
  status: number;
  location: string | null;
  body: string;
};

export const visit = async (
  jar: Jar,
  path: string,
  init: RequestInit = {},
): Promise<Hit> => {
  const cookie = serialise(jar);
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      ...(init.headers ?? {}),
      ...(cookie ? { cookie } : {}),
    },
  });

  absorb(jar, response);

  const location = response.headers.get("location");
  const body =
    response.status >= 300 && response.status < 400 ? "" : await response.text();

  return {
    status: response.status,
    location: location ? new URL(location, BASE_URL).pathname : null,
    body,
  };
};

/* --------------------------------------------------------- identities */

export const createIdentity = async (handle: string) => {
  const email = `${handle}@${TEST_DOMAIN}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`could not create ${email}: ${error?.message}`);
  return { id: data.user.id, email };
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A one time token for this address, without sending anything.
 *
 * Supabase rate limits this, and a suite that signs the same seven people in
 * thirty times will hit that limit rather than find a bug. Hence the retry
 * here, and the caching below: each identity authenticates once and the tests
 * share the result, which is also closer to how a person actually uses Spark.
 */
export const linkFor = async (email: string) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (!error && data.properties) {
      return {
        tokenHash: data.properties.hashed_token,
        code: data.properties.email_otp,
      };
    }

    if (!/rate limit/i.test(error?.message ?? "")) {
      throw new Error(`could not generate a link for ${email}: ${error?.message}`);
    }

    await pause(2000 * (attempt + 1));
  }

  throw new Error(
    `Rate limited generating a link for ${email}. Supabase caps token ` +
      `verifications per hour per IP, and repeated runs of this suite share ` +
      `that budget. Wait for the window, or raise the limit under ` +
      `Authentication, Rate Limits.`,
  );
};

/** Signs a jar in the way the emailed link does, through the real route. */
export const signIn = async (jar: Jar, email: string): Promise<Hit> => {
  const { tokenHash } = await linkFor(email);
  const hit = await visit(jar, `/spark/auth/callback?token_hash=${tokenHash}&type=magiclink`);

  const signedIn = Array.from(jar.keys()).some((name) => name.startsWith("sb-"));
  if (!signedIn) {
    throw new Error(
      `${email} did not end up signed in. Supabase caps token verifications ` +
        `per hour per IP; repeated runs share that budget.`,
    );
  }

  if (!cached.has(email)) cached.set(email, new Map(jar));
  return hit;
};

const cached = new Map<string, Jar>();

/**
 * The same person, in a second jar, without signing in again.
 *
 * Copies a session this suite already established, the way opening a second
 * tab would. Used by the tests that only need to be somebody, not by the ones
 * that change what being somebody means.
 */
export const adopt = async (email: string): Promise<Jar> => {
  if (!cached.has(email)) await signIn(newJar(), email);
  return new Map(cached.get(email)!);
};

const clients = new Map<string, SupabaseClient>();

/**
 * The session this jar is carrying, read back out of the cookies.
 *
 * Supabase rate limits token verification to a few dozen an hour per address,
 * and a suite that verified once per assertion would spend that budget on
 * plumbing instead of on the two places where verification is the thing being
 * tested. So each identity verifies exactly once, and the data layer client is
 * built by adopting that same session rather than establishing a second one.
 */
const sessionFromJar = (jar: Jar) => {
  const chunks = Array.from(jar.entries())
    .filter(([name]) => /^sb-.+-auth-token(\.\d+)?$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, cookie]) => decodeURIComponent(cookie.value))
    .join("");

  if (!chunks) throw new Error("no Supabase session in this jar");

  const json = chunks.startsWith("base64-")
    ? Buffer.from(chunks.slice("base64-".length), "base64url").toString("utf8")
    : chunks;

  const parsed = JSON.parse(json);
  if (!parsed?.access_token || !parsed?.refresh_token) {
    throw new Error("the session cookie did not contain a session");
  }
  return parsed as { access_token: string; refresh_token: string };
};

/** A client bound to one person's own session, for the data layer assertions. */
export const clientFor = async (email: string): Promise<SupabaseClient> => {
  const existing = clients.get(email);
  if (existing) return existing;

  const session = sessionFromJar(await adopt(email));
  const supabase = createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.setSession(session);
  if (error) throw new Error(`could not adopt the session for ${email}: ${error.message}`);

  clients.set(email, supabase);
  return supabase;
};

/**
 * Ages a jar's access token past its expiry, leaving the refresh token intact.
 *
 * The access token lives an hour. Rather than wait one out, this rewrites the
 * session cookie so the server believes it already has, which is the state a
 * person returning the next morning arrives in. What should happen next is a
 * silent refresh, not a request to verify again.
 */
export const expireAccessToken = (jar: Jar): boolean => {
  const names = Array.from(jar.keys()).filter((name) =>
    /^sb-.+-auth-token(\.\d+)?$/.test(name),
  );
  if (names.length !== 1) return false;

  const [name] = names;
  const cookie = jar.get(name)!;
  const raw = decodeURIComponent(cookie.value);
  if (!raw.startsWith("base64-")) return false;

  const session = JSON.parse(
    Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8"),
  );
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  session.expires_in = 0;

  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");

  /* Only if it still fits in one cookie; the library would chunk a longer one
     and this helper does not pretend to reimplement that. */
  if (encoded.length > 3180) return false;

  jar.set(name, { value: encoded, persistent: cookie.persistent });
  return true;
};

export const accessTokenOf = (jar: Jar): string | null => {
  const names = Array.from(jar.keys()).filter((name) =>
    /^sb-.+-auth-token(\.\d+)?$/.test(name),
  );
  if (names.length !== 1) return null;
  const raw = decodeURIComponent(jar.get(names[0])!.value);
  if (!raw.startsWith("base64-")) return null;
  return JSON.parse(
    Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8"),
  ).access_token ?? null;
};

export const anonClient = () =>
  createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
