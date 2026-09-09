import assert from "node:assert/strict";
import test from "node:test";

import {
  childrenOf,
  cleanLink,
  contributors,
  eventTotals,
  keptValue,
  outsideTotals,
  parseAmount,
  shapeLine,
  type Line,
  type LineInput,
} from "../lib/spark/budget.ts";

/**
 * The money, held still.
 *
 * The rules worth a test are the ones nobody can see. A $750 machine named
 * inside a $1,500 allocation must not read as $2,250 of spending. A speaker
 * SHINE keeps must not quietly consume the weekend's ceiling. And whether
 * something counts against the budget must never be read off whether it is
 * kept afterwards, because that is exactly the mistake this model replaced.
 */

const line = (over: Partial<Line> = {}): Line => ({
  id: "line-1",
  kind: "allocation",
  category: "Food",
  label: "Meals",
  planned_cents: 100_00,
  committed_cents: 0,
  actual_cents: 0,
  status: "estimate",
  note: null,
  vendor: null,
  source_url: null,
  owner_name: null,
  spark_id: null,
  counts_toward_budget: true,
  reusable: false,
  reuse_note: null,
  parent_id: null,
  ...over,
});

/* The four cases the old one-field model could not tell apart. */
const food = line({ id: "food", label: "Meals", planned_cents: 12_500_00 });
const barista = line({ id: "barista", label: "Barista and espresso equipment", planned_cents: 1_500_00 });
const espresso = line({
  id: "espresso", kind: "purchase", label: "Espresso machine", planned_cents: 750_00,
  counts_toward_budget: true, reusable: true, parent_id: "barista",
});
const speaker = line({
  id: "speaker", kind: "purchase", label: "JBL speaker", planned_cents: 700_00,
  counts_toward_budget: false, reusable: true,
});
const mics = line({
  id: "mics", kind: "purchase", label: "Microphones", planned_cents: 130_00,
  counts_toward_budget: false, reusable: true,
});
const outsideConsumable = line({
  id: "donated", label: "Donated flowers", planned_cents: 200_00,
  counts_toward_budget: false, reusable: false,
});

const shine = [food, barista, espresso, speaker, mics];

/* ------------------------------------ counting against the weekend's money */

test("the event total counts what spends the budget and nothing else", () => {
  assert.equal(eventTotals(shine).planned, 12_500_00 + 1_500_00);
});

test("a detail inside a counted allocation is not counted again", () => {
  /* The whole structural point. $1,500 that names a $750 machine inside it is
     $1,500 of spending, not $2,250. */
  assert.equal(eventTotals([barista, espresso]).planned, 1_500_00);
});

test("a kept purchase inside the budget still counts once", () => {
  const alone = line({ id: "solo", kind: "purchase", planned_cents: 750_00, reusable: true });
  assert.equal(eventTotals([alone]).planned, 750_00);
});

test("purchases funded from elsewhere leave the ceiling alone", () => {
  const ceiling = 60_000_00;
  const without = ceiling - eventTotals([food, barista]).planned;
  const withPa = ceiling - eventTotals([food, barista, speaker, mics]).planned;
  assert.equal(without, withPa);
});

test("what is bought from elsewhere is totalled on its own", () => {
  assert.equal(outsideTotals(shine).planned, 830_00);
});

test("a detail two levels down is still only counted at the top", () => {
  const middle = line({ id: "mid", planned_cents: 400_00, parent_id: "barista" });
  const leaf = line({ id: "leaf", planned_cents: 100_00, parent_id: "mid" });
  assert.equal(eventTotals([barista, middle, leaf]).planned, 1_500_00);
});

test("a detail whose parent does not count is still counted itself", () => {
  /* Otherwise money hides: an allocation funded elsewhere that names one item
     the weekend does pay for would lose that item from every total. */
  const paid = line({ id: "paid", planned_cents: 90_00, counts_toward_budget: true, parent_id: "speaker" });
  assert.equal(eventTotals([speaker, paid]).planned, 90_00);
});

test("committed and spent follow the same rule as planned", () => {
  const parent = line({ id: "p", planned_cents: 1_000_00, committed_cents: 400_00, actual_cents: 100_00 });
  const child = line({ id: "c", planned_cents: 300_00, committed_cents: 300_00, actual_cents: 50_00, parent_id: "p" });
  assert.deepEqual(eventTotals([parent, child]), { planned: 1_000_00, committed: 400_00, spent: 100_00 });
});

/* ------------------------------------------------- what SHINE still owns */

test("kept value spans both sides of the budget", () => {
  const kept = keptValue(shine);
  assert.equal(kept.total, 750_00 + 700_00 + 130_00);
  assert.equal(kept.insideBudget, 750_00);
  assert.equal(kept.outsideBudget, 830_00);
});

test("kept value counts the machine without adding it to the budget again", () => {
  /* $750 of lasting value out of a $1,500 allocation, and the allocation is
     still $1,500. These two numbers are computed independently on purpose. */
  assert.equal(eventTotals([barista, espresso]).planned, 1_500_00);
  assert.equal(keptValue([barista, espresso]).total, 750_00);
});

test("a kept thing inside a kept thing is not kept twice", () => {
  const rig = line({ id: "rig", planned_cents: 1_000_00, reusable: true, counts_toward_budget: false });
  const part = line({ id: "part", planned_cents: 200_00, reusable: true, counts_toward_budget: false, parent_id: "rig" });
  assert.equal(keptValue([rig, part]).total, 1_000_00);
});

test("nothing kept is nothing to report, not a zero to explain", () => {
  assert.deepEqual(keptValue([food, outsideConsumable]).lines, []);
  assert.equal(keptValue([food, outsideConsumable]).total, 0);
});

/* ------------------------------- the two questions really are independent */

test("all four combinations survive the round trip", () => {
  const all = [food, espresso, speaker, outsideConsumable];
  const seen = all.map((row) => `${row.counts_toward_budget}/${row.reusable}`);
  assert.deepEqual(seen, ["true/false", "true/true", "false/true", "false/false"]);
});

test("changing whether it counts moves the budget once, and never the kept value", () => {
  const before = eventTotals([food, speaker]).planned;
  const after = eventTotals([food, { ...speaker, counts_toward_budget: true }]).planned;
  assert.equal(after - before, 700_00);
  assert.equal(keptValue([food, speaker]).total, keptValue([food, { ...speaker, counts_toward_budget: true }]).total);
});

test("changing whether it is kept never moves the budget", () => {
  assert.equal(
    eventTotals([food, speaker]).planned,
    eventTotals([food, { ...speaker, reusable: false }]).planned,
  );
});

/* --------------------------------------------------- a parent chain gone wrong */

test("a line pointing at a parent that is gone is still counted", () => {
  const orphan = line({ id: "orphan", planned_cents: 300_00, parent_id: "deleted" });
  assert.equal(eventTotals([orphan]).planned, 300_00);
});

test("a parent chain that loops does not hang, and loses nothing", () => {
  const a = line({ id: "a", planned_cents: 100_00, parent_id: "b" });
  const b = line({ id: "b", planned_cents: 100_00, parent_id: "a" });
  assert.equal(contributors([a, b], (row) => row.counts_toward_budget).length, 2);
});

test("the details under a line are the ones that name it", () => {
  assert.deepEqual(childrenOf(shine, "barista").map((row) => row.id), ["espresso"]);
  assert.deepEqual(childrenOf(shine, "food"), []);
});

/* --------------------------------------------------------------- amounts */

test("a blank amount is not yet known, not a mistake", () => {
  assert.deepEqual(parseAmount("   "), { ok: true, cents: 0 });
});

test("dollars and cents survive the trip", () => {
  assert.deepEqual(parseAmount("$1,234.56"), { ok: true, cents: 123_456 });
});

test("something that is not a number is said out loud", () => {
  assert.equal(parseAmount("about seven hundred").ok, false);
  assert.equal(parseAmount("-50").ok, false);
});

/* ----------------------------------------------------------------- links */

test("a blank link stays blank rather than becoming a guess", () => {
  assert.deepEqual(cleanLink(""), { ok: true, url: null });
});

test("a link has to be one a planner could follow", () => {
  assert.equal(cleanLink("javascript:alert(1)").ok, false);
  assert.equal(cleanLink("the JBL one").ok, false);
  assert.equal(cleanLink("https://example.com/speaker").ok, true);
});

/* ------------------------------------------------------------- new lines */

const entry = (over: Partial<LineInput> = {}): LineInput => ({
  kind: "allocation",
  category: "Food",
  label: "Coffee",
  planned: "120",
  committed: "",
  actual: "",
  status: "estimate",
  note: "",
  vendor: "",
  owner: "",
  link: "",
  counts: "yes",
  reusable: "no",
  reuseNote: "",
  ...over,
});

test("a line nobody can name is not a line", () => {
  assert.equal(shapeLine(entry({ label: "  " })).ok, false);
});

test("a purchase names its own category when none is given", () => {
  const shaped = shapeLine(entry({ kind: "purchase", category: "", status: "to_buy" }));
  assert.equal(shaped.ok && shaped.row.category, "Equipment");
});

test("an allocation still has to say which category", () => {
  assert.equal(shapeLine(entry({ category: "" })).ok, false);
});

test("the two answers are stored as given, neither read off the other", () => {
  const kept = shapeLine(entry({ kind: "purchase", counts: "no", reusable: "yes", status: "to_buy" }));
  assert.equal(kept.ok && kept.row.counts_toward_budget, false);
  assert.equal(kept.ok && kept.row.reusable, true);

  const spent = shapeLine(entry({ kind: "purchase", counts: "yes", reusable: "no", status: "to_buy" }));
  assert.equal(spent.ok && spent.row.counts_toward_budget, true);
  assert.equal(spent.ok && spent.row.reusable, false);
});

test("a status from the wrong kind falls back rather than being stored", () => {
  assert.equal(shapeLine(entry({ status: "to_buy" })).ok && shapeLine(entry({ status: "to_buy" })).ok, true);
  const alloc = shapeLine(entry({ status: "to_buy" }));
  assert.equal(alloc.ok && alloc.row.status, "estimate");
  const buy = shapeLine(entry({ kind: "purchase", status: "protected" }));
  assert.equal(buy.ok && buy.row.status, "to_buy");
});

test("a note about where it goes is dropped when it is not being kept", () => {
  const shaped = shapeLine(entry({ reusable: "no", reuseNote: "SHINE office" }));
  assert.equal(shaped.ok && shaped.row.reuse_note, null);
});

test("the note is optional for something that is being kept", () => {
  const shaped = shapeLine(entry({ reusable: "yes", reuseNote: "  " }));
  assert.equal(shaped.ok && shaped.row.reusable, true);
  assert.equal(shaped.ok && shaped.row.reuse_note, null);
});

test("what was left blank is stored as nothing, not as an empty string", () => {
  const shaped = shapeLine(entry());
  assert.equal(shaped.ok && shaped.row.vendor, null);
  assert.equal(shaped.ok && shaped.row.owner_name, null);
  assert.equal(shaped.ok && shaped.row.source_url, null);
  assert.equal(shaped.ok && shaped.row.note, null);
});

test("a bad amount stops the whole line rather than storing part of it", () => {
  assert.equal(shapeLine(entry({ actual: "twelve" })).ok, false);
});
