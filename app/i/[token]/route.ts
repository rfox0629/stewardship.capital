import { NextResponse, type NextRequest } from "next/server";

import {
  invitationByToken,
  workspaceById,
  workspacePath,
} from "../../../lib/spark/directory";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VIEWER_COOKIE,
  sealSession,
} from "../../../lib/spark/session";

/**
 * An invitation link.
 *
 * Takes an invited person through authentication and directly into the
 * workspace they were invited to, rather than dropping them on a sign in
 * screen to work out where they belong.
 *
 * Possession of the token is the only check today. Before this is worth
 * anything the tokens have to be unguessable, single use, and expiring, and
 * the redemption has to verify the address it was issued to.
 *
 * A bad token is not told it is bad. It goes to the front door like anything
 * else, so the route cannot be used to test which tokens exist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitation = invitationByToken(token);
  const workspace = invitation
    ? workspaceById(invitation.workspaceId)
    : undefined;

  if (!invitation || !workspace) {
    return NextResponse.redirect(new URL("/more", request.url));
  }

  const response = NextResponse.redirect(
    new URL(workspacePath(workspace), request.url),
  );

  response.cookies.set(
    SESSION_COOKIE,
    await sealSession(invitation.email, invitation.workspaceId, invitation.role),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
    },
  );

  response.cookies.set(VIEWER_COOKIE, invitation.role, {
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
