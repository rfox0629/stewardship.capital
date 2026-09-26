import { createAdminClient } from "./supabase/admin.ts";
import { createLimiter, databaseStore, memoryStore, type Rule } from "./throttle.ts";

/**
 * The limits themselves, in one place.
 *
 * Sign in codes: Supabase caps its own sends per project, and because every
 * request reaches Supabase from Vercel's servers, its per-IP limits count
 * Vercel rather than the visitor. So one visitor could spend the whole
 * project's budget, or fill one member's inbox. These limits count the
 * visitor and the address instead. They count unknown addresses exactly like
 * known ones, so a refusal says nothing about who has an account.
 *
 * Inquiries: generous for a person, useless for a script.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const codeRequestRules = (ip: string, email: string): Rule[] => [
  { bucket: "code:ip", key: ip, limit: 10, windowSeconds: 15 * MINUTE },
  { bucket: "code:email", key: email, limit: 3, windowSeconds: 15 * MINUTE },
];

export const invitationCodeRules = (ip: string, email: string): Rule[] => [
  { bucket: "invite:ip", key: ip, limit: 10, windowSeconds: 15 * MINUTE },
  { bucket: "invite:email", key: email, limit: 3, windowSeconds: 15 * MINUTE },
];

/* The same message sent twice (a double click, a retry) is folded into one
   email by Resend's idempotency key rather than by a limit here, so a retry
   after a failed send still goes through. */
export const inquiryRules = (ip: string, email: string): Rule[] => [
  { bucket: "inquiry:ip", key: ip, limit: 3, windowSeconds: HOUR },
  { bucket: "inquiry:email", key: email, limit: 3, windowSeconds: HOUR },
  /* A ceiling on the whole form, so it can never become a way to spend the
     sending account's quota. */
  { bucket: "inquiry:all", key: "all", limit: 40, windowSeconds: 24 * HOUR },
];

let limiter: ReturnType<typeof createLimiter> | null = null;

const getLimiter = () => {
  if (!limiter) {
    let shared = null;
    try {
      shared = databaseStore(createAdminClient());
    } catch {
      /* No service role configured: the per-instance fallback still limits. */
    }
    limiter = createLimiter(shared, memoryStore());
  }
  return limiter;
};

/** Allowed only if every rule allows it. See lib/throttle.ts. */
export const withinLimits = async (rules: Rule[]): Promise<boolean> => getLimiter()(rules);
