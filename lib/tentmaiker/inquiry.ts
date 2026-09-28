/**
 * "Let's Make It Happen": the one form on tentmaiker.com.
 *
 * Everything here is plain functions, so the rules can be tested without a
 * server: what counts as a valid inquiry, what looks like a script rather than
 * a person, the email that is sent, and what counts as sent. The server action
 * in app/tentmaiker/actions.ts wires them to the request, the shared limiter
 * and Resend.
 */

export const INQUIRY_FROM = "Tent MAiKER <inquiries@tentmaiker.com>";
export const INQUIRY_TO = "ryan@usamissionaries.org";

export const LIMITS = {
  firstName: 60,
  lastName: 60,
  phone: 32,
  email: 254,
  messageMin: 10,
  message: 2000,
  links: 3,
  /** A person takes longer than this to read, type and send. */
  minimumFillMs: 3000,
} as const;

export type Inquiry = {
  firstName: string;
  lastName: string;
  /** First and last, for the subject line and the greeting. */
  name: string;
  phone: string;
  email: string;
  message: string;
};

export type FieldErrors = Partial<Record<Exclude<keyof Inquiry, "name">, string>>;

export type Parsed =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; errors: FieldErrors }
  /** Looks like a script. Refused without saying which signal tripped. */
  | { ok: false; spam: true };

const EMAIL = /^[^\s@<>"',;:()[\]\\]+@[^\s@<>"',;:()[\]\\]+\.[^\s@<>"',;:()[\]\\]{2,}$/;
/* Digits and the punctuation people write phone numbers with, and an optional
   extension. Anything else in the field is not a phone number. */
const PHONE = /^\+?[\d\s().-]+(\s*(x|ext\.?)\s*\d{1,6})?$/i;
/* Control characters other than the line breaks a message may contain. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const text = (value: FormDataEntryValue | null | undefined) =>
  typeof value === "string" ? value : "";

export const parseInquiry = (
  form: { get: (name: string) => FormDataEntryValue | null },
  now: number = Date.now(),
): Parsed => {
  /* The field a person never sees. Anything in it came from a script. */
  if (text(form.get("website")).trim() !== "") return { ok: false, spam: true };

  const opened = Number(text(form.get("opened")));
  if (!Number.isFinite(opened) || now - opened < LIMITS.minimumFillMs || now - opened > 24 * 3600 * 1000) {
    return { ok: false, spam: true };
  }

  const oneLine = (field: string) => text(form.get(field)).replace(/\s+/g, " ").trim();
  const firstName = oneLine("firstName");
  const lastName = oneLine("lastName");
  const phone = oneLine("phone");
  const email = text(form.get("email")).trim();
  const message = text(form.get("message")).replace(/\r\n?/g, "\n").trim();

  const errors: FieldErrors = {};
  if (!firstName) errors.firstName = "Please add your first name.";
  else if (firstName.length > LIMITS.firstName || CONTROL.test(firstName)) errors.firstName = "Please shorten your first name.";

  if (!lastName) errors.lastName = "Please add your last name.";
  else if (lastName.length > LIMITS.lastName || CONTROL.test(lastName)) errors.lastName = "Please shorten your last name.";

  const digits = phone.replace(/\D/g, "").length;
  if (!phone) errors.phone = "Please add a phone number.";
  else if (phone.length > LIMITS.phone || !PHONE.test(phone) || digits < 7 || digits > 20) {
    errors.phone = "That phone number doesn't look complete.";
  }

  if (!email) errors.email = "Please add an email we can reply to.";
  else if (email.length > LIMITS.email || !EMAIL.test(email) || CONTROL.test(email)) {
    errors.email = "That email doesn't look complete.";
  }

  if (message.length < LIMITS.messageMin) errors.message = "Tell us a little more about what you need.";
  else if (message.length > LIMITS.message) errors.message = `Please keep it under ${LIMITS.message} characters.`;
  else if (CONTROL.test(message)) errors.message = "The message contains characters we can't send.";

  if (Object.keys(errors).length) return { ok: false, errors };

  /* A handful of links is a person sharing context; a page of them is not. */
  if ((message.match(/https?:\/\//gi) ?? []).length > LIMITS.links) return { ok: false, spam: true };

  return {
    ok: true,
    inquiry: { firstName, lastName, name: `${firstName} ${lastName}`, phone, email, message },
  };
};

/** The same person sending the same words twice counts once. */
export const fingerprint = (inquiry: Pick<Inquiry, "email" | "message">) =>
  `${inquiry.email.toLowerCase()}\u0000${inquiry.message.replace(/\s+/g, " ").toLowerCase()}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const inquiryEmail = (inquiry: Inquiry) => ({
  from: INQUIRY_FROM,
  to: [INQUIRY_TO],
  reply_to: inquiry.email,
  subject: `Tent MAiKER inquiry from ${inquiry.name}`,
  text: [
    `Name: ${inquiry.name}`,
    `Phone: ${inquiry.phone}`,
    `Email: ${inquiry.email}`,
    "",
    inquiry.message,
    "",
    "Sent from the Let's Make It Happen form on tentmaiker.com. Reply to answer.",
  ].join("\n"),
  html: [
    `<p><strong>Name:</strong> ${escapeHtml(inquiry.name)}<br>`,
    `<strong>Phone:</strong> ${escapeHtml(inquiry.phone)}<br>`,
    `<strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>`,
    `<p style="color:#666;font-size:12px">Sent from the Let's Make It Happen form on tentmaiker.com. Reply to answer.</p>`,
  ].join(""),
});

export type SendResult = { ok: true; id: string } | { ok: false; reason: "unconfigured" | "rejected" | "network" };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Sent means Resend accepted it and gave it an id. Anything else, including a
 * missing key, is not sent, and the visitor is told so rather than thanked.
 */
export const sendThroughResend = async (
  payload: ReturnType<typeof inquiryEmail>,
  apiKey: string | undefined,
  idempotencyKey: string,
  fetcher: Fetch = fetch,
): Promise<SendResult> => {
  if (!apiKey) return { ok: false, reason: "unconfigured" };
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return { ok: false, reason: "rejected" };
    const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
    return typeof body?.id === "string" && body.id ? { ok: true, id: body.id } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
};
