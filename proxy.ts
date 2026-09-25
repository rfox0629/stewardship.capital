import { NextResponse, type NextRequest } from "next/server";

import { resolveAccess } from "./lib/spark/access";
import { authorizeSparkPath } from "./lib/spark/authorize";
import {
  PLATFORM_HOME,
  SPARK_ENTRY,
  canonicalGuidePath,
  isOpenSparkPath,
  lockedPreviewPath,
  isSparkPath,
  preferShortPath,
  shortGuidePath,
  workspaceRootOf,
} from "./lib/spark/paths";
import {
  COMPANY_ORIGIN,
  cleanPath,
  isCompanyOwnedPath,
  isProductHost,
  isSiteOnlyPath,
  productPath,
} from "./lib/spark/hosts";
import { createProxyClient, hasIdentity } from "./lib/supabase/proxy";

/* The guide's own credential, checked here so no team page renders without
   one. Hashing in the edge runtime, where node:crypto is not available. */
const EVENT_COOKIE = "shine_team";

const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

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
  const asked = request.nextUrl.pathname;
  const { supabase, box } = createProxyClient(request);

  /* The product has its own domain. On it, the clean addresses are rewritten
     onto the paths that implement them, and the company's own surfaces are
     not served at all.

     The rewrite is worked out here but applied at the end, after the guard has
     decided. A rewrite returned early would end the request without the guard
     ever running, which would make a change of address into a way around the
     membership check. Everything below therefore reasons about `pathname`,
     the path inside the application, and `pass()` is the only way out. */
  const onProduct = isProductHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  if (onProduct && isSiteOnlyPath(asked)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  /* The platform console stayed with the company, so asking the product for
     it hands the whole address over rather than half serving it here. */
  if (onProduct && isCompanyOwnedPath(asked)) {
    return NextResponse.redirect(
      new URL(`${asked}${request.nextUrl.search}`, COMPANY_ORIGIN),
    );
  }

  /* The product's front door is the root of its own domain. The path that
     implements it still answers, so nothing breaks, but the address bar ends
     up on the address people are given. Only the front door is moved this
     way: deeper paths are left alone, because a redirect in the middle of a
     navigation is a good way to break one. */
  if (onProduct && (asked === SPARK_ENTRY || asked === `${SPARK_ENTRY}/`)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }

  const pathname = (onProduct ? productPath(asked) : null) ?? asked;

  /* Somebody turned away on the product domain is turned away to one of its
     own addresses, not to the path that implements it. */
  const exit = (destination: string) =>
    new URL(onProduct ? cleanPath(destination) : destination, request.url);

  const pass = () => {
    if (pathname === asked) return box.response;
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    const rewritten = NextResponse.rewrite(target);
    /* A refreshed session has to survive the change of address. */
    box.response.cookies.getAll().forEach((cookie) => {
      rewritten.cookies.set(cookie);
    });
    return rewritten;
  };

  /* The guide has a short address now, and the workspace path it replaced is
     retired. Anyone arriving on the old one, from a bookmark or an older
     printed card, is moved across with their query string intact. */
  const shortened = shortGuidePath(pathname);
  if (shortened) {
    const target = request.nextUrl.clone();
    target.pathname = shortened;
    return NextResponse.redirect(target);
  }

  /* A short address is authorized as the workspace path it stands for, so
     there is one set of rules rather than two that can disagree. */
  const canonical = canonicalGuidePath(pathname) ?? pathname;

  /* The weekend's code opens the team guide and nothing else. It is checked
     against the database on every request, like a membership is, so a session
     that has expired or been cleared stops working at once. */
  const asksForTeam = lockedPreviewPath(pathname) !== null;
  if (asksForTeam && supabase) {
    const token = request.cookies.get(EVENT_COOKIE)?.value;
    const root = workspaceRootOf(canonical.replace(/\/team$/, ""));
    if (token && root) {
      const { data } = await supabase.rpc("event_session_active", {
        p_token_hash: await hashToken(token),
        p_client: root.clientSlug,
        p_series: root.eventSlug,
        p_edition: root.editionSlug,
      });
      if (data === true) return pass();
    }
  }

  if (isSparkPath(canonical)) {
    /* The front door, invitation links, the emailed link callback, and signing
       out are reachable without a session by design. Refreshing the session is
       still worth doing on them: it is how the front door knows a returning
       person is already signed in. */
    if (isOpenSparkPath(canonical)) {
      if (supabase) await hasIdentity(supabase);
      return pass();
    }

    /* One round trip that both proves the identity and reads what it may
       currently reach. A missing configuration, an expired session, a revoked
       refresh token, and a forged cookie all resolve to no access. */
    const access = supabase ? await resolveAccess(supabase) : null;

    /* A workspace root is where the weekend guide lives, and a published
       guide is public. Ask the database, only for that one path, whether this
       engagement has published it. */
    const root = workspaceRootOf(canonical);
    let publicGuide = false;
    if (root && supabase) {
      const { data } = await supabase.rpc("weekend_guide_published", {
        p_client: root.clientSlug,
        p_series: root.eventSlug,
        p_edition: root.editionSlug,
      });
      publicGuide = data === true;
    }

    const decision = authorizeSparkPath(canonical, access, { publicGuide });

    if (!decision.allow) {
      /* The team guide answers a stranger with its own public front door,
         served at the same address, rather than a redirect that would make a
         shared link preview as the sign in screen. The refusal stands: this
         is a different page, and no team content is loaded for it. */
      const locked = lockedPreviewPath(pathname);
      if (locked) {
        const door = request.nextUrl.clone();
        door.pathname = locked;
        door.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
        const preview = NextResponse.rewrite(door);
        box.response.cookies.getAll().forEach((cookie) => {
          preview.cookies.set(cookie);
        });
        return preview;
      }

      const refusal = NextResponse.redirect(exit(preferShortPath(decision.redirectTo)));
      /* Carry any refreshed session cookies onto the redirect, so a refusal
         does not quietly sign someone out of the workspace they do belong to. */
      box.response.cookies.getAll().forEach((cookie) => {
        refusal.cookies.set(cookie);
      });
      return refusal;
    }

    return pass();
  }

  /* Stewardship.Capital's own home. Signed out, the page shows the same
     sign in that Spark uses, so the request goes through; the page renders
     nothing but the door. Signed in without the staff grant is sent to
     Spark's front door, which knows where that person does belong. The page
     asks the same question again before it renders a single row. */
  if (startsWithAny(pathname, [PLATFORM_HOME])) {
    const access = supabase ? await resolveAccess(supabase) : null;
    if (access && !access.staff) {
      const refusal = NextResponse.redirect(exit(SPARK_ENTRY));
      box.response.cookies.getAll().forEach((cookie) => {
        refusal.cookies.set(cookie);
      });
      return refusal;
    }
    return pass();
  }

  /* The preserved financial platform is parked behind the explicit staff
     grant. Spark and the legacy surfaces share one identity pool, so identity
     alone would let any Spark guest walk into this product; membership of an
     engagement was never meant to mean that. */
  if (startsWithAny(pathname, legacyProtected)) {
    const access = supabase ? await resolveAccess(supabase) : null;
    if (!access) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(login);
    }
    if (!access.staff) {
      return NextResponse.redirect(exit(SPARK_ENTRY));
    }
    return pass();
  }

  if (startsWithAny(pathname, legacyAuthPages)) {
    if (await hasIdentity(supabase)) {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname = "/dashboard";
      dashboard.search = "";
      return NextResponse.redirect(dashboard);
    }
  }

  return pass();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
