import { NextResponse, type NextRequest } from "next/server";
import { cleanPath, isProductHost } from "../../../lib/spark/hosts";
import { cookies } from "next/headers";

import { INVITE_COOKIE, OTP_EMAIL_COOKIE } from "../../../lib/spark/cookies";
import { PLATFORM_HOME, SPARK_ENTRY } from "../../../lib/spark/paths";
import { createClient } from "../../../lib/supabase/server";

/**
 * Leaves Spark.
 *
 * signOut revokes the refresh token at Supabase rather than only dropping the
 * cookies, so a copied session cannot be resumed from somewhere else after
 * someone signs out on their phone.
 *
 * Leaving lands on the door you came in by. The platform home has its own,
 * so a form may name it; anything else lands on Spark's front door.
 */
const DOORS = new Set([SPARK_ENTRY, PLATFORM_HOME]);

const doorFrom = async (request: NextRequest) => {
  try {
    const next = (await request.formData()).get("next");
    if (typeof next === "string" && DOORS.has(next)) return next;
  } catch {
    /* No form body, or not one we can read. The default door is fine. */
  }
  return SPARK_ENTRY;
};
export async function POST(request: NextRequest) {
  const door = await doorFrom(request);

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* Nothing to end, or nothing to end it with. Either way, leave. */
  }

  const store = await cookies();
  store.delete(OTP_EMAIL_COOKIE);
  store.delete(INVITE_COOKIE);

  return NextResponse.redirect(
    new URL(
      isProductHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
        ? cleanPath(door)
        : door,
      request.url,
    ),
    { status: 303 },
  );
}
