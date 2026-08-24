"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { landingFor, workspaceHome } from "../../lib/spark/authorize";
import { choicesFrom, resolveAccess, workspaceById } from "../../lib/spark/access";
import {
  INVITE_COOKIE,
  OTP_EMAIL_COOKIE,
  OTP_MAX_AGE,
  transientCookie,
} from "../../lib/spark/cookies";
import { acceptInvitation } from "../../lib/spark/invitations";
import { maskEmail } from "../../lib/spark/mask";
import { SPARK_ENTRY } from "../../lib/spark/paths";
import { createClient } from "../../lib/supabase/server";
import type { Choice } from "../../lib/spark/access";

/**
 * The whole sign in flow, as three server actions.
 *
 * Supabase Auth decides who someone is. These decide nothing about identity at
 * all: they hand an address to Supabase, hand a code back to Supabase, and
 * then ask the database what that verified identity may currently reach.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RequestOutcome =
  | { status: "sent"; hint: string }
  | { status: "invalid" }
  /** Spark itself could not send right now. Says nothing about the address. */
  | { status: "unavailable" };

export type VerifyOutcome =
  | { status: "invalid" }
  | { status: "restart" }
  | { status: "refused" }
  | { status: "choose"; workspaces: Choice[] };

/**
 * Step one. Asks Supabase to post a code to an address.
 *
 * shouldCreateUser is false, so this can never be account creation, and an
 * address Supabase does not know is answered exactly like one it does: the
 * refusal it returns for an unknown address is treated as sent, because
 * telling the truth there would make the form a directory of who has access.
 *
 * Infrastructure is different. A rate limit, a mail failure, or a missing
 * configuration means nobody was going to receive anything, so pretending a
 * code went out would strand the person on a code screen that can never
 * succeed. Those answer unavailable, in the same words for every cause.
 *
 * Both paths take the same time. The call is awaited to learn which happened,
 * and the response is padded to a floor so a quick refusal and a slow SMTP
 * handoff are indistinguishable from outside.
 */
const RESPONSE_FLOOR_MS = 1600;

const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

export async function requestAccess(email: string): Promise<RequestOutcome> {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address)) return { status: "invalid" };

  const started = Date.now();
  let outcome: RequestOutcome = { status: "sent", hint: maskEmail(address) };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false },
    });

    if (error) {
      /* The refusal for an address with no account. This is the ordinary
         answer for a non member and must look exactly like success. */
      const unknownAddress =
        error.code === "otp_disabled" ||
        error.code === "signup_disabled" ||
        /signups? not allowed/i.test(error.message ?? "");

      if (!unknownAddress) outcome = { status: "unavailable" };
    }
  } catch {
    outcome = { status: "unavailable" };
  }

  if (outcome.status === "sent") {
    const store = await cookies();
    store.set(OTP_EMAIL_COOKIE, address, transientCookie(OTP_MAX_AGE));
  }

  await pause(RESPONSE_FLOOR_MS - (Date.now() - started));
  return outcome;
}

/**
 * Step two. The code proves the person asking reads the address.
 *
 * The address comes from the cookie this browser was given in step one, and
 * the code has to match what Supabase sent to it, so neither half alone gets
 * anyone in.
 */
export async function verifyAccess(code: string): Promise<VerifyOutcome> {
  const store = await cookies();
  const email = store.get(OTP_EMAIL_COOKIE)?.value;
  if (!email) return { status: "restart" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim().replace(/\s+/g, ""),
    type: "email",
  });

  if (error) return { status: "invalid" };

  store.delete(OTP_EMAIL_COOKIE);

  /* Verified identity in hand, an invitation can now become membership. The
     database refuses it unless this address is the invited one. */
  const invite = store.get(INVITE_COOKIE)?.value;
  if (invite) {
    await acceptInvitation(supabase, invite);
    store.delete(INVITE_COOKIE);
  }

  const access = await resolveAccess(supabase);
  const landing = landingFor(access);

  if (landing.kind === "platform" || landing.kind === "workspace") {
    redirect(landing.href);
  }

  if (landing.kind === "choose" && access) {
    return { status: "choose", workspaces: choicesFrom(access) };
  }

  /* Verified, and a member of nothing. Spark does not explain who else exists,
     so this says no more than that. */
  return { status: "refused" };
}

/** Step three, only for people who belong to more than one. */
export async function chooseWorkspace(engagementId: string): Promise<void> {
  const supabase = await createClient();
  const access = await resolveAccess(supabase);

  /* Checked against membership resolved on this request, so a stale button
     from a workspace someone has since been removed from goes nowhere. */
  const workspace = workspaceById(access, engagementId);
  if (!workspace) redirect(SPARK_ENTRY);

  redirect(workspaceHome(workspace));
}

export async function signOutOfSpark(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* Nothing to end, or nothing to end it with. Either way, leave. */
  }

  const store = await cookies();
  store.delete(OTP_EMAIL_COOKIE);
  store.delete(INVITE_COOKIE);

  redirect(SPARK_ENTRY);
}
