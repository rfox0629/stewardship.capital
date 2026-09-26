import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { resolveAccess, workspaceById } from "../../../../lib/spark/access";
import {
  INVITE_COOKIE,
  INVITE_MAX_AGE,
  OTP_EMAIL_COOKIE,
  OTP_MAX_AGE,
  transientCookie,
} from "../../../../lib/spark/cookies";
import { workspaceHome } from "../../../../lib/spark/authorize";
import {
  acceptInvitation,
  ensureAccountExists,
  findLiveInvitation,
} from "../../../../lib/spark/invitations";
import { cleanPath, isProductHost } from "../../../../lib/spark/hosts";
import { SPARK_ENTRY } from "../../../../lib/spark/paths";
import { invitationCodeRules, withinLimits } from "../../../../lib/limits";
import { createClient } from "../../../../lib/supabase/server";
import { clientAddress } from "../../../../lib/throttle";

/**
 * An invitation link begins the identity flow. It does not end it.
 *
 * The token is never the session, and it is never a credential on its own.
 * Following the link posts a code to the address the invitation was issued to;
 * the person still has to prove they read it. Only then does the invitation
 * become membership, and from that moment access is decided by the
 * workspace_members row rather than by anything the link carried.
 *
 * Every failure looks identical from outside. Malformed, unknown, expired,
 * revoked, already accepted, and undeliverable all land on the front door, so
 * the route cannot be used to test which tokens exist or once existed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {

/* The address to send somebody to, in the form the domain they came to
   publishes. The route underneath is the same either way. */
const landingUrl = (request: NextRequest, path: string) =>
  new URL(
    isProductHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
      ? cleanPath(path)
      : path,
    request.url,
  );

  const frontDoor = NextResponse.redirect(landingUrl(request, SPARK_ENTRY));

  const { token } = await params;
  const invitation = await findLiveInvitation(token);
  if (!invitation) return frontDoor;

  const supabase = await createClient().catch(() => null);
  if (!supabase) return frontDoor;

  const store = await cookies();
  const access = await resolveAccess(supabase);

  if (access) {
    /* Already signed in as the invited person: nothing left to prove, so the
       invitation becomes membership now. */
    if (access.email.toLowerCase() === invitation.email) {
      const accepted = await acceptInvitation(supabase, invitation.tokenHash);
      if (!accepted.ok) return frontDoor;

      const joined = workspaceById(
        await resolveAccess(supabase),
        accepted.engagementId,
      );
      if (!joined) return frontDoor;

      return NextResponse.redirect(landingUrl(request, workspaceHome(joined)));
    }

    /* Signed in as somebody else. Hold the invitation rather than acting on
       it, so signing out and back in as the invited address still works. */
    store.set(INVITE_COOKIE, invitation.tokenHash, transientCookie(INVITE_MAX_AGE));
    return frontDoor;
  }

  /* No session yet. A live invitation is the one thing that authorises an
     account to exist, so it is created here, deliberately, rather than by
     leaving signup open to everyone. */
  if (!(await ensureAccountExists(invitation.email))) return frontDoor;

  /* Following the same link again and again must not become a way to fill the
     invited person's inbox. Over the limit, no code is sent, but the
     invitation is held, so signing in from the front door still accepts it. */
  if (!(await withinLimits(invitationCodeRules(clientAddress(request.headers), invitation.email)))) {
    store.set(INVITE_COOKIE, invitation.tokenHash, transientCookie(INVITE_MAX_AGE));
    return frontDoor;
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: invitation.email,
      options: { shouldCreateUser: false },
    });
    if (error) return frontDoor;
  } catch {
    return frontDoor;
  }

  store.set(OTP_EMAIL_COOKIE, invitation.email, transientCookie(OTP_MAX_AGE));
  store.set(INVITE_COOKIE, invitation.tokenHash, transientCookie(INVITE_MAX_AGE));

  return NextResponse.redirect(landingUrl(request, SPARK_ENTRY));
}
