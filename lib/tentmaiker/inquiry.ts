/**
 * The inquiry form on tentmaiker.com/contact, the one form on the site.
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
  name: 100,
  phone: 32,
  email: 254,
  messageMin: 10,
  message: 2000,
  links: 3,
  /** A person takes longer than this to read, type and send. */
  minimumFillMs: 3000,
} as const;

export type Inquiry = {
  name: string;
  /** Optional: empty when the visitor would rather be emailed. */
  phone: string;
  email: string;
  message: string;
};

export type FieldErrors = Partial<Record<keyof Inquiry, string>>;

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
  const name = oneLine("name");
  const phone = oneLine("phone");
  const email = text(form.get("email")).trim();
  const message = text(form.get("message")).replace(/\r\n?/g, "\n").trim();

  const errors: FieldErrors = {};
  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > LIMITS.name || CONTROL.test(name)) errors.name = "Please shorten your name.";

  /* Phone is optional; when given, it has to be a phone number. */
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (phone.length > LIMITS.phone || !PHONE.test(phone) || digits < 7 || digits > 20)) {
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
    inquiry: { name, phone, email, message },
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
    `Phone: ${inquiry.phone || "not given"}`,
    `Email: ${inquiry.email}`,
    "",
    inquiry.message,
    "",
    "Sent from tentmaiker.com/contact. Reply to answer.",
  ].join("\n"),
  html: [
    `<p><strong>Name:</strong> ${escapeHtml(inquiry.name)}<br>`,
    `<strong>Phone:</strong> ${escapeHtml(inquiry.phone || "not given")}<br>`,
    `<strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>`,
    `<p style="color:#666;font-size:12px">Sent from tentmaiker.com/contact. Reply to answer.</p>`,
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
