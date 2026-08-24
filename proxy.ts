import { NextResponse, type NextRequest } from "next/server";

import { resolveAccess } from "./lib/spark/access";
import { authorizeSparkPath } from "./lib/spark/authorize";
import { isOpenSparkPath, isSparkPath } from "./lib/spark/paths";
import { createProxyClient, hasIdentity } from "./lib/supabase/proxy";

/**
 * Spark is invitation only, so the gate lives at the route.
 *
 * Checking access on the sign in screen alone would be decoration: anyone
 * could type a workspace URL. Every request into Spark is checked here, and
 * membership is read from the database on each one.
 *
 * That last part is the point. Supabase Auth says who someone is and keeps
 * saying it for as long as their session lasts. What they may reach is a
 * different question with a different answer, asked again every time, so
 * removing someone from an engagement locks them out on their next request
 * rather than whenever their identity happens to expire.
 */

const legacyProtected = ["/dashboard"];
const legacyAuthPages = ["/login", "/signup"];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, box } = createProxyClient(request);

  if (isSparkPath(pathname)) {
    /* The front door, invitation links, the emailed link callback, and signing
       out are reachable without a session by design. Refreshing the session is
       still worth doing on them: it is how the front door knows a returning
       person is already signed in. */
    if (isOpenSparkPath(pathname)) {
      if (supabase) await hasIdentity(supabase);
      return box.response;
    }

    /* One round trip that both proves the identity and reads what it may
       currently reach. A missing configuration, an expired session, a revoked
       refresh token, and a forged cookie all resolve to no access. */
    const access = supabase ? await resolveAccess(supabase) : null;
    const decision = authorizeSparkPath(pathname, access);

    if (!decision.allow) {
      const refusal = NextResponse.redirect(
        new URL(decision.redirectTo, request.url),
      );
      /* Carry any refreshed session cookies onto the redirect, so a refusal
         does not quietly sign someone out of the workspace they do belong to. */
      box.response.cookies.getAll().forEach((cookie) => {
        refusal.cookies.set(cookie);
      });
      return refusal;
    }

    return box.response;
  }

  /* The preserved financial platform keeps the guard it already had. */
  if (startsWithAny(pathname, legacyProtected)) {
    if (!(await hasIdentity(supabase))) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(login);
    }
    return box.response;
  }

  if (startsWithAny(pathname, legacyAuthPages)) {
    if (await hasIdentity(supabase)) {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname = "/dashboard";
      dashboard.search = "";
      return NextResponse.redirect(dashboard);
    }
  }

  return box.response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
