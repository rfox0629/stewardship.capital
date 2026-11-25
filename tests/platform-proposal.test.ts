import assert from "node:assert/strict";
import test from "node:test";

import {
  hashShareToken,
  looksLikeShareToken,
  randomShareToken,
  sharePath,
} from "../lib/platform/proposal-shares.ts";
import {
  infrastructureMonthly,
  milestoneTotal,
  proposalFor,
  proposalsFor,
} from "../lib/platform/proposals.ts";
import { hashInvitationToken } from "../lib/spark/tokens.ts";

/* The proposal's figures are data, so the arithmetic is checked here rather
   than read off a screen. */

const shine = proposalFor("shine", "ministry-impact-platform");

test("SHINE has the Ministry Impact Platform proposal and nobody else does", () => {
  assert.ok(shine);
  assert.equal(proposalsFor("shine").length, 1);
  assert.equal(proposalsFor("chicken-coop-company").length, 0);
  assert.equal(proposalFor("chicken-coop-company", "ministry-impact-platform"), null);
});

test("the milestones add up to the fixed investment", () => {
  assert.ok(shine);
  assert.equal(shine.investment.total, 9500);
  assert.equal(milestoneTotal(shine), 9500);
  assert.deepEqual(
    shine.investment.milestones.map((milestone) => milestone.amount),
    [2850, 3800, 2850],
  );
});

test("the infrastructure lines sit inside the anticipated range", () => {
  assert.ok(shine);
  assert.equal(infrastructureMonthly(shine), 45);
  assert.equal(shine.investment.infrastructure.totalRange, "$45–$60/month");
  assert.equal(shine.ownership.coveredMonths, 6);
});

test("the deck has exactly the five sections, in order", () => {
  assert.ok(shine);
  assert.deepEqual(
    shine.sections.map((section) => section.label),
    ["Overview", "Live Demo", "Future Platform", "Investment", "Ownership & Continuity"],
  );
  assert.equal(shine.future.modules.length, 8);
  assert.equal(shine.ownership.paths.length, 3);
});

test("the presenter is TentMAiKER and the close line is set", () => {
  assert.ok(shine);
  assert.equal(shine.presenter.name, "TentMAiKER");
  assert.equal(shine.close.line, "Build the foundation once. Expand it as the ministry grows.");
  assert.match(shine.close.byline, /^Presented by TentMAiKER\.$/);
  /* The hosting company is the infrastructure, not the presenter. */
  assert.doesNotMatch(JSON.stringify(shine), /Stewardship\.Capital/);
});

test("a share token is shaped like an invitation token but hashes apart from one", async () => {
  const token = randomShareToken();
  assert.ok(looksLikeShareToken(token));
  assert.equal(sharePath(token), `/p/${token}`);
  assert.notEqual(await hashShareToken(token), await hashInvitationToken(token));
  assert.equal(await hashShareToken(token), await hashShareToken(token));
});

test("a malformed share token is refused before any lookup", () => {
  assert.equal(looksLikeShareToken(undefined), false);
  assert.equal(looksLikeShareToken("short"), false);
  assert.equal(looksLikeShareToken("A".repeat(32)), false);
});
