/**
 * The inquiry form on tentmaiker.com/contact, the one form on the site.
 *
 * Everything here is plain functions, so the rules can be tested without a
 * server: what counts as a valid inquiry, what looks like a script rather than
 * a person, the email that is sent, and what counts as sent. The server action
 * in app/tentmaiker/actions.ts wires them to the request, the shared limiter
 * and Resend.
 */

export const INQUIRY_FROM = "TENTMAiKER <inquiries@tentmaiker.com>";
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
  subject: `TENTMAiKER inquiry from ${inquiry.name}`,
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

/* Acts 18:3, World English Bible (public domain), "tentmakers" as one word. */
const VERSE =
  "Because he practiced the same trade, he lived with them and worked, for by trade they were tentmakers.";

/**
 * The name to greet someone by, or nothing. The confirmation goes to whatever
 * address was typed, so it carries none of the visitor's own words except a
 * plain first name: anything else (a link, a sentence) and the greeting stays
 * generic, so the form cannot be used to send someone else a message.
 */
export const greetingName = (name: string): string | null => {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}'\u2019.-]{0,29}$/u.test(first) ? first : null;
};

/**
 * The note the visitor receives once their inquiry has reached us. Built with
 * tables and inline styles, the way email clients still need it, in the
 * site's own night palette.
 */
export const confirmationEmail = (inquiry: Inquiry) => {
  const first = greetingName(inquiry.name);
  const greeting = first ? `Thank you, ${first}` : "Thank you";
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  return {
    from: INQUIRY_FROM,
    to: [inquiry.email],
    subject: "Thanks for reaching out to TENTMAiKER",
    text: [
      `${greeting}.`,
      "",
      "We received your message and we're glad you reached out. We'll read it closely and be in touch soon.",
      "",
      `"${VERSE}"`,
      "Acts 18:3",
      "",
      "TENTMAiKER",
      "Making Tents. Funding Mission.",
      "https://tentmaiker.com",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Thanks for reaching out to TENTMAiKER</title>
</head>
<body style="margin:0;padding:0;background-color:#040506;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">We received your message and will be in touch soon.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#040506" style="background-color:#040506;">
<tr><td align="center" style="padding:48px 16px 56px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td style="padding:0 4px 32px;font-family:${font};font-size:13px;font-weight:700;letter-spacing:4px;color:#ffffff;">TENTM<span style="color:#9ccaff;">Ai</span>KER</td></tr>
<tr><td bgcolor="#0a0d11" style="background-color:#0a0d11;border:1px solid #1d242d;border-radius:16px;padding:44px 32px 40px;">
<h1 style="margin:0;font-family:${font};font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-1px;color:#ffffff;">${escapeHtml(greeting)}<span style="color:#9ccaff;">.</span></h1>
<p style="margin:20px 0 0;font-family:${font};font-size:16px;line-height:1.65;color:#c3cad3;">We received your message and we&rsquo;re glad you reached out. We&rsquo;ll read it closely and be in touch soon.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;">
<tr><td style="border-left:2px solid #9ccaff;padding:2px 0 2px 20px;">
<p style="margin:0;font-family:${font};font-size:17px;line-height:1.6;color:#e4e8ed;">&ldquo;${VERSE}&rdquo;</p>
<p style="margin:12px 0 0;font-family:${font};font-size:11px;font-weight:700;letter-spacing:3px;color:#9ccaff;">ACTS 18:3</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:28px 4px 0;font-family:${font};font-size:12px;line-height:1.7;color:#6f7883;">
Making Tents. Funding Mission.&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="https://tentmaiker.com" style="color:#9ccaff;text-decoration:none;">tentmaiker.com</a><br>
You&rsquo;re receiving this because you wrote to us at tentmaiker.com.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
};

export type SendResult = { ok: true; id: string } | { ok: false; reason: "unconfigured" | "rejected" | "network" };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Sent means Resend accepted it and gave it an id. Anything else, including a
 * missing key, is not sent, and the visitor is told so rather than thanked.
 */
export const sendThroughResend = async (
  payload: { from: string; to: string[]; subject: string; text: string; html: string; reply_to?: string },
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
