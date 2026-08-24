import type { CookieOptions } from "@supabase/ssr";

/**
 * How Spark's session cookies are written.
 *
 * @supabase/ssr defaults to httpOnly false, because a browser side Supabase
 * client has to be able to read the session out of the cookie. Spark has no
 * such client: every call to Supabase happens on the server, so the access and
 * refresh tokens have no reason to be visible to page scripts, and making them
 * invisible means an injected script cannot read a session out of the document
 * and replay it somewhere else.
 *
 * Anything that later needs Supabase in the browser has to reckon with this
 * first, deliberately, rather than discovering it as a bug.
 *
 * maxAge is left to the library, which asks for 400 days, the longest a
 * browser will honour. That is what keeps someone signed in between visits;
 * how long the session is actually good for is decided by Supabase, which
 * rotates the refresh token on use and can revoke it at any time.
 */
export const sparkCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};
