import { NextResponse, type NextRequest } from "next/server";

import { SPARK_BASE, pathBelongsToWorkspace, workspaceById, workspacePath } from "./lib/spark/directory";
import { SESSION_COOKIE, readSession } from "./lib/spark/session";
import { updateSession } from "./lib/supabase/proxy";

/**
 * Spark is invitation only, so the gate has to live at the route.
 *
 * Checking access on the sign in screen alone would be decoration: anyone
 * could type a workspace URL. Every request into Spark is checked here, and a
 * signed in person can only reach the workspace they belong to.
 */
async function guardSpark(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/more", request.url));
  }

  const workspace = workspaceById(session.workspaceId);
  if (!workspace) {
    return NextResponse.redirect(new URL("/more", request.url));
  }

  const home = workspacePath(workspace);

  /* The planner home lists every client on the platform, so it is the one
     surface a client must never reach. */
  if (pathname === SPARK_BASE || pathname === `${SPARK_BASE}/`) {
    return session.role === "planner"
      ? null
      : NextResponse.redirect(new URL(home, request.url));
  }

  if (session.role === "planner") return null;

  return pathBelongsToWorkspace(pathname, workspace)
    ? null
    : NextResponse.redirect(new URL(home, request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === SPARK_BASE || pathname.startsWith(`${SPARK_BASE}/`)) {
    const refusal = await guardSpark(request);
    if (refusal) return refusal;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
