import assert from "node:assert/strict";
import test from "node:test";

import {
  INQUIRY_FROM,
  INQUIRY_TO,
  fingerprint,
  inquiryEmail,
  parseInquiry,
  sendThroughResend,
} from "../lib/tentmaiker/inquiry.ts";

const NOW = 1_800_000_000_000;

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  const filled = {
    name: "Priscilla",
    email: "priscilla@example.org",
    message: "We run a small ministry and need a volunteer schedule that works.",
    website: "",
    opened: String(NOW - 20_000),
    ...fields,
  };
  for (const [key, value] of Object.entries(filled)) data.set(key, value);
  return data;
};

test("a complete inquiry from a person is accepted", () => {
  const parsed = parseInquiry(form({}), NOW);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.inquiry.email, "priscilla@example.org");
});

test("missing and malformed fields are named, one message each", () => {
  const parsed = parseInquiry(form({ name: " ", email: "not-an-email", message: "hi" }), NOW);
  assert.equal(parsed.ok, false);
  assert.ok(!parsed.ok && "errors" in parsed);
  if (!parsed.ok && "errors" in parsed) {
    assert.deepEqual(Object.keys(parsed.errors).sort(), ["email", "message", "name"]);
  }
});

test("unusual but valid addresses are welcome", () => {
  for (const email of ["a.b+tag@sub.example.co.uk", "ohare@example.ie", "x@example.museum"]) {
    const parsed = parseInquiry(form({ email }), NOW);
    assert.equal(parsed.ok, true, email);
  }
});

test("a header cannot be smuggled in through the name or the address", () => {
  for (const fields of [
    { email: "a@example.org\nBcc: victim@example.org" },
    { email: "a@example.org, victim@example.org" },
    { email: "Victim <victim@example.org>" },
  ]) {
    const parsed = parseInquiry(form(fields), NOW);
    assert.equal(parsed.ok, false, JSON.stringify(fields));
  }
  /* Line breaks in a name are folded to spaces, never carried into a subject. */
  const parsed = parseInquiry(form({ name: "Aquila\r\nBcc: victim@example.org" }), NOW);
  assert.ok(parsed.ok);
  if (parsed.ok) assert.doesNotMatch(inquiryEmail(parsed.inquiry).subject, /[\r\n]/);
});

test("the hidden field and an instant submit read as a script", () => {
  const trap = parseInquiry(form({ website: "https://spam.example" }), NOW);
  assert.ok(!trap.ok && "spam" in trap);
  const instant = parseInquiry(form({ opened: String(NOW - 500) }), NOW);
  assert.ok(!instant.ok && "spam" in instant);
  const forged = parseInquiry(form({ opened: "yesterday" }), NOW);
  assert.ok(!forged.ok && "spam" in forged);
});

test("a message that is mostly links is refused", () => {
  const links = Array.from({ length: 5 }, (_, i) => `https://x${i}.example`).join(" ");
  const parsed = parseInquiry(form({ message: `Look at these ${links}` }), NOW);
  assert.ok(!parsed.ok && "spam" in parsed);
});

test("lengths are bounded", () => {
  assert.equal(parseInquiry(form({ message: "x".repeat(2001) }), NOW).ok, false);
  assert.equal(parseInquiry(form({ name: "x".repeat(101) }), NOW).ok, false);
});

test("the email goes from Tent MAiKER to Ryan, and a reply goes to the visitor", () => {
  const parsed = parseInquiry(form({ name: "<b>Aquila</b>", message: "<script>alert(1)</script> need help" }), NOW);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  const email = inquiryEmail(parsed.inquiry);
  assert.equal(email.from, "Tent MAiKER <inquiries@tentmaiker.com>");
  assert.equal(INQUIRY_FROM, email.from);
  assert.deepEqual(email.to, ["ryan@usamissionaries.org"]);
  assert.equal(INQUIRY_TO, "ryan@usamissionaries.org");
  assert.equal(email.reply_to, "priscilla@example.org");
  assert.doesNotMatch(email.html, /<script>|<b>Aquila/, "visitor text is escaped in the HTML");
  assert.match(email.text, /<script>alert\(1\)<\/script> need help/, "and kept verbatim in the text part");
});

test("the same words from the same person share a fingerprint", () => {
  const a = fingerprint({ name: "A", email: "P@example.org", message: "Hello  there,\nfriend" });
  const b = fingerprint({ name: "B", email: "p@example.org", message: "hello there, friend" });
  assert.equal(a, b);
});

/* ------------------------------------------------------------ sending */

const reply = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

const payload = inquiryEmail({ name: "P", email: "p@example.org", message: "A long enough message." });

test("sent means Resend accepted it and returned an id", async () => {
  let seen: RequestInit | undefined;
  const result = await sendThroughResend(payload, "re_test", "key-1", async (_url, init) => {
    seen = init;
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  });
  assert.deepEqual(result, { ok: true, id: "email_123" });
  assert.equal((seen?.headers as Record<string, string>)["Idempotency-Key"], "key-1");
});

test("a refusal, a missing id, a network failure or a missing key is not sent", async () => {
  assert.deepEqual(await sendThroughResend(payload, "re_test", "k", reply(403, { message: "domain not verified" })), {
    ok: false,
    reason: "rejected",
  });
  assert.deepEqual(await sendThroughResend(payload, "re_test", "k", reply(200, {})), { ok: false, reason: "rejected" });
  assert.deepEqual(
    await sendThroughResend(payload, "re_test", "k", (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch),
    { ok: false, reason: "network" },
  );
  assert.deepEqual(await sendThroughResend(payload, undefined, "k"), { ok: false, reason: "unconfigured" });
});
