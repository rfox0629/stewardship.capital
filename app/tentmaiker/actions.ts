"use server";

import { headers } from "next/headers";

import { inquiryRules, withinLimits } from "@lib/limits";
import { hashKey, clientAddress } from "@lib/throttle";
import {
  fingerprint,
  inquiryEmail,
  parseInquiry,
  sendThroughResend,
  type FieldErrors,
} from "@lib/tentmaiker/inquiry";

/** What was typed, handed back so a refusal never erases it. */
export type Draft = { name: string; email: string; message: string };

export type InquiryState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; errors: FieldErrors; draft: Draft }
  /** Too many from this visitor or address, or the form's daily ceiling. */
  | { status: "limited"; draft: Draft }
  /** Not sent: a script, a missing key, or Resend said no. Same words for all. */
  | { status: "unavailable"; draft: Draft };

const draftOf = (form: FormData): Draft => {
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.slice(0, 2000) : "";
  };
  return { name: field("name"), email: field("email"), message: field("message") };
};

/**
 * Validated here, limited across every server instance, and sent through
 * Resend. "Sent" is only ever the answer when Resend accepted the email.
 */
export async function sendInquiry(_previous: InquiryState, form: FormData): Promise<InquiryState> {
  const draft = draftOf(form);
  const parsed = parseInquiry(form);
  if (!parsed.ok) {
    return "errors" in parsed
      ? { status: "invalid", errors: parsed.errors, draft }
      : { status: "unavailable", draft };
  }

  const { inquiry } = parsed;
  const ip = clientAddress(await headers());
  const same = fingerprint(inquiry);

  if (!(await withinLimits(inquiryRules(ip, inquiry.email)))) {
    return { status: "limited", draft };
  }

  const result = await sendThroughResend(
    inquiryEmail(inquiry),
    process.env.RESEND_API_KEY,
    await hashKey("inquiry:idempotency", same),
  );

  if (!result.ok) {
    console.error("inquiry: not sent", result.reason);
    return { status: "unavailable", draft };
  }

  console.info("inquiry: accepted by Resend", result.id);
  return { status: "sent" };
}
