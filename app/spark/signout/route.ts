import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { INVITE_COOKIE, OTP_EMAIL_COOKIE } from "../../../lib/spark/cookies";
import { SPARK_ENTRY } from "../../../lib/spark/paths";
import { createClient } from "../../../lib/supabase/server";

/**
 * Leaves Spark.
 *
 * signOut revokes the refresh token at Supabase rather than only dropping the
 * cookies, so a copied session cannot be resumed from somewhere else after
 * someone signs out on their phone.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* Nothing to end, or nothing to end it with. Either way, leave. */
  }

  const store = await cookies();
  store.delete(OTP_EMAIL_COOKIE);
  store.delete(INVITE_COOKIE);

  return NextResponse.redirect(new URL(SPARK_ENTRY, request.url), { status: 303 });
}

export const GET = POST;
