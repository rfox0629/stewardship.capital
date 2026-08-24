import { NextResponse, type NextRequest } from "next/server";

import { authorizeSparkPath, isSparkPath } from "./lib/spark/authorize";
import { SparkConfigError, sessionSecret } from "./lib/spark/config";
import { SESSION_COOKIE, readSession } from "./lib/spark/session";
import { updateSession } from "./lib/supabase/proxy";

/**
 * Spark is invitation only, so the gate lives at the route.
 *
 * Checking access on the sign in screen alone would be decoration: anyone
 * could type a workspace URL. Every request into Spark is checked here, and a
 * signed in person can only reach the workspace they belong to.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSparkPath(pathname)) {
    let session = null;

    try {
      session = await readSession(
        request.cookies.get(SESSION_COOKIE)?.value,
        sessionSecret(),
      );
    } catch (error) {
      /* A misconfigured production deploy refuses access rather than falling
         back to a secret everyone knows. */
      if (!(error instanceof SparkConfigError)) throw error;
      session = null;
    }

    const decision = authorizeSparkPath(pathname, session);
    if (!decision.allow) {
      return NextResponse.redirect(new URL(decision.redirectTo, request.url));
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
