import assert from "node:assert/strict";
import test from "node:test";

import { codeRequestRules, inquiryRules, invitationCodeRules } from "../lib/limits.ts";
import {
  clientAddress,
  createLimiter,
  hashKey,
  memoryStore,
  type ThrottleStore,
} from "../lib/throttle.ts";

/* Anything that sends an email because a stranger asked is metered. These
   drive the real limiter against a store shaped like the shared database
   counter, so what holds here holds in production. */

const failing: ThrottleStore = {
  async take() {
    throw new Error("function public.take_request_slot does not exist");
  },
};

const repeat = async (times: number, run: () => Promise<boolean>) => {
  const results: boolean[] = [];
  for (let i = 0; i < times; i += 1) results.push(await run());
  return results;
};

test("one visitor cannot keep requesting codes for the same address", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  const results = await repeat(5, () => limit(codeRequestRules("203.0.113.9", "member@example.org")));
  assert.deepEqual(results, [true, true, true, false, false]);
});

test("rotating addresses from one visitor is capped per visitor", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  const results = await repeat(12, async () =>
    limit(codeRequestRules("203.0.113.9", `someone-${Math.random()}@example.org`)),
  );
  assert.equal(results.filter(Boolean).length, 10, "ten per visitor per window");
});

test("rotating visitors cannot flood one member's inbox", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  let n = 0;
  const results = await repeat(6, () => limit(codeRequestRules(`198.51.100.${n++}`, "member@example.org")));
  assert.deepEqual(results, [true, true, true, false, false, false]);
});

test("unknown and known addresses are counted the same, so a refusal reveals nothing", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  const known = await repeat(4, () => limit(codeRequestRules("203.0.113.1", "member@example.org")));
  const unknown = await repeat(4, () => limit(codeRequestRules("203.0.113.2", "nobody@example.org")));
  assert.deepEqual(known, unknown);
});

test("addresses are matched regardless of case and spacing", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  await repeat(3, () => limit(codeRequestRules("203.0.113.9", "Member@Example.org")));
  assert.equal(await limit(codeRequestRules("203.0.113.10", " member@example.org ")), false);
});

test("a person signing in normally is never refused", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  /* Asks, then asks once more because the first mail was slow. */
  assert.equal(await limit(codeRequestRules("203.0.113.5", "member@example.org")), true);
  assert.equal(await limit(codeRequestRules("203.0.113.5", "member@example.org")), true);
  /* And an invitation followed twice from the same phone. */
  assert.equal(await limit(invitationCodeRules("203.0.113.5", "member@example.org")), true);
  assert.equal(await limit(invitationCodeRules("203.0.113.5", "member@example.org")), true);
});

test("the window resets", async () => {
  let clock = 0;
  const store = memoryStore(() => clock);
  const limit = createLimiter(store, memoryStore());
  await repeat(3, () => limit(codeRequestRules("203.0.113.9", "member@example.org")));
  assert.equal(await limit(codeRequestRules("203.0.113.9", "member@example.org")), false);
  clock += 15 * 60 * 1000;
  assert.equal(await limit(codeRequestRules("203.0.113.9", "member@example.org")), true);
});

test("the limit holds across server instances that share a counter", async () => {
  /* Two instances, as Vercel runs them: separate processes, one database. */
  const shared = memoryStore();
  const instanceA = createLimiter(shared, memoryStore());
  const instanceB = createLimiter(shared, memoryStore());
  const rules = () => codeRequestRules("203.0.113.9", "member@example.org");
  const results = [
    await instanceA(rules()),
    await instanceB(rules()),
    await instanceA(rules()),
    await instanceB(rules()),
  ];
  assert.deepEqual(results, [true, true, true, false]);
});

test("without the shared counter, each instance still limits on its own", async () => {
  const limit = createLimiter(failing, memoryStore());
  const results = await repeat(4, () => limit(codeRequestRules("203.0.113.9", "member@example.org")));
  assert.deepEqual(results, [true, true, true, false], "never no limit at all");
});

test("a refused rule keeps counting, so hammering does not reset it", async () => {
  const counted: string[] = [];
  const spy: ThrottleStore = {
    async take(bucket) {
      counted.push(bucket);
      return bucket !== "code:email";
    },
  };
  await createLimiter(spy, memoryStore())(codeRequestRules("203.0.113.9", "member@example.org"));
  assert.deepEqual(counted, ["code:ip", "code:email"]);
});

test("the same address cannot send more than three inquiries an hour", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  let n = 0;
  const results = await repeat(4, () => limit(inquiryRules(`198.51.100.${n++}`, "friend@example.org")));
  assert.deepEqual(results, [true, true, true, false]);
});

test("inquiries are capped per visitor", async () => {
  const limit = createLimiter(memoryStore(), memoryStore());
  const results = await repeat(5, async () =>
    limit(inquiryRules("203.0.113.9", `p${Math.random()}@example.org`)),
  );
  assert.deepEqual(results, [true, true, true, false, false]);
});

test("keys are hashed, never stored as written", async () => {
  const hash = await hashKey("code:email", "member@example.org");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, await hashKey("code:email", "  MEMBER@example.org"));
  assert.notEqual(hash, await hashKey("inquiry:email", "member@example.org"), "buckets do not share keys");
});

test("the visitor's address comes from the platform's headers first", () => {
  const headers = (pairs: Record<string, string>) => ({ get: (name: string) => pairs[name] ?? null });
  assert.equal(
    clientAddress(headers({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "10.0.0.1" })),
    "203.0.113.7",
  );
  assert.equal(clientAddress(headers({ "x-real-ip": "203.0.113.8" })), "203.0.113.8");
  assert.equal(clientAddress(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(clientAddress(headers({})), "unknown");
});
