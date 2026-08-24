import { NextResponse, type NextRequest } from "next/server";

import { SparkConfigError, sessionSecret } from "../../../lib/spark/config";
import { readInvitation } from "../../../lib/spark/invitations";
import { consumedInvitations } from "../../../lib/spark/invitation-store";
import { sendVerificationCode } from "../../../lib/spark/mailer";
import { CHALLENGE_COOKIE, CHALLENGE_MAX_AGE } from "../../../lib/spark/session";
import { issueChallenge, sealChallenge } from "../../../lib/spark/verification";

/**
 * An invitation link begins the identity flow. It does not end it.
 *
 * The token is never the session. Following the link posts a code to the
 * address the invitation was issued to, and the person still has to prove they
 * read it. Only then is an ordinary Spark session created and the invitation
 * burned.
 *
 * Every failure looks the same from outside: unknown, expired, already
 * accepted, and undeliverable all land on the front door, so the route cannot
 * be used to test which tokens exist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const frontDoor = NextResponse.redirect(new URL("/more", request.url));

  let secret: string;
  try {
    secret = sessionSecret();
  } catch (error) {
    if (error instanceof SparkConfigError) return frontDoor;
    throw error;
  }

  const { token } = await params;
  const claims = await readInvitation(token, secret);
  if (!claims) return frontDoor;

  if (await consumedInvitations.has(claims.jti)) return frontDoor;

  const { challenge, code } = await issueChallenge(claims.email, secret, {
    jti: claims.jti,
    workspaceId: claims.workspaceId,
    role: claims.role,
  });

  try {
    await sendVerificationCode(claims.email, code);
  } catch {
    return frontDoor;
  }

  const response = NextResponse.redirect(new URL("/more", request.url));
  response.cookies.set(CHALLENGE_COOKIE, await sealChallenge(challenge, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CHALLENGE_MAX_AGE,
  });
  return response;
}
