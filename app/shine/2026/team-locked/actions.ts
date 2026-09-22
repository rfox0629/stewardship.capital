"use server";

import { cookies, headers } from "next/headers";

import {
  callerHash,
  EVENT_COOKIE,
  EVENT_COOKIE_PATH,
  EVENT_EXPIRES,
  normaliseCode,
  safeNext,
  sha256,
} from "@lib/spark/event-code";
import { createClient } from "@lib/supabase/server";

import { SHINE_2026 } from "../route-params";

/**
 * The team's door.
 *
 * What arrives is a code; what leaves this function is a cookie. The database
 * is handed the hash and decides: it knows the real code's hash, it counts
 * recent wrong answers, and it mints the session. Nothing here logs what was
 * typed, and the code is not in any file the browser downloads.
 */

export type CodeOutcome =
  | { ok: true; next: string }
  | { ok: false; message: string };

export async function enterTeamCode(
  _previous: CodeOutcome | null,
  form: FormData,
): Promise<CodeOutcome> {
  const typed = normaliseCode(String(form.get("code") ?? ""));
  const next = safeNext(String(form.get("next") ?? ""));

  if (!typed) return { ok: false, message: "Enter the team code to continue." };

  const supabase = await createClient().catch(() => null);
  if (!supabase) return { ok: false, message: "That did not work. Try again in a moment." };

  const headerBag = await headers();
  const caller = callerHash(
    headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    headerBag.get("user-agent"),
  );

  const { data, error } = await supabase.rpc("open_event_session", {
    p_client: SHINE_2026.clientSlug,
    p_series: SHINE_2026.eventSlug,
    p_edition: SHINE_2026.edition,
    p_code_hash: sha256(typed),
    p_client_hash: caller,
  });

  if (error || typeof data !== "string" || data.length < 32) {
    /* One answer for a wrong code and for too many tries, so guessing learns
       nothing from the difference. */
    return { ok: false, message: "That code did not work. Check with your team lead." };
  }

  const store = await cookies();
  store.set(EVENT_COOKIE, data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: EVENT_COOKIE_PATH,
    expires: EVENT_EXPIRES,
  });

  return { ok: true, next };
}
