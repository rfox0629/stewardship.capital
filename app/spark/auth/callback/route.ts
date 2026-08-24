import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { resolveAccess } from "../../../../lib/spark/access";
import { landingFor } from "../../../../lib/spark/authorize";
import { INVITE_COOKIE, OTP_EMAIL_COOKIE } from "../../../../lib/spark/cookies";
import { acceptInvitation } from "../../../../lib/spark/invitations";
import { SPARK_ENTRY } from "../../../../lib/spark/paths";
import { createClient } from "../../../../lib/supabase/server";

/**
 * Where an emailed link lands, for people who tap the link rather than type
 * the code. Same verification either way: Supabase decides whether the token
 * is genuine, and this route only decides where to put the person afterwards.
 *
 * A link that has already been used, or was tampered with, ends at the front
 * door with no session, which is the same place an unrecognised address ends.
 */
export async function GET(request: NextRequest) {
  const frontDoor = new URL(SPARK_ENTRY, request.url);

  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  if (!tokenHash && !code) return NextResponse.redirect(frontDoor);

  const supabase = await createClient().catch(() => null);
  if (!supabase) return NextResponse.redirect(frontDoor);

  /* Two shapes of emailed link, because which one arrives depends on how the
     email template is written. token_hash is what a template using
     {{ .TokenHash }} produces; code is what Supabase's own redirect produces.
     Both are verified by Supabase, neither is trusted here. */
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (type ?? "magiclink") as "email" | "magiclink" | "invite" | "recovery",
      })
    : await supabase.auth.exchangeCodeForSession(code as string);

  if (error) return NextResponse.redirect(frontDoor);

  const store = await cookies();
  store.delete(OTP_EMAIL_COOKIE);

  const invite = store.get(INVITE_COOKIE)?.value;
  if (invite) {
    await acceptInvitation(supabase, invite);
    store.delete(INVITE_COOKIE);
  }

  const landing = landingFor(await resolveAccess(supabase));

  /* Choosing between several, and belonging to none, are both decided by the
     front door. It already knows how to render either. */
  if (landing.kind === "platform" || landing.kind === "workspace") {
    return NextResponse.redirect(new URL(landing.href, request.url));
  }

  return NextResponse.redirect(frontDoor);
}
