import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanLink,
  overlaps,
  parseAmount,
  shapeLine,
  totalsFor,
  type Line,
  type LineInput,
} from "../lib/spark/budget.ts";

/**
 * The money, held still.
 *
 * The rule worth protecting with a test is the one nobody can see: a speaker
 * SHINE keeps must not quietly consume the weekend's sixty thousand dollar
 * ceiling. That is arithmetic, it is invisible when it goes wrong, and the
 * whole point of separating the ledgers is that it never does.
 */

const line = (over: Partial<Line> = {}): Line => ({
  id: "line-1",
  ledger: "event",
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
  review_of: null,
  ...over,
});

/* ------------------------------------------------------------ two ledgers */

test("the event total counts only what producing the weekend costs", () => {
  const lines = [
    line({ id: "a", planned_cents: 500_00 }),
    line({ id: "b", ledger: "equipment", planned_cents: 750_00 }),
  ];
  assert.equal(totalsFor(lines, "event").planned, 500_00);
});

test("equipment is planned and tracked in its own total", () => {
  const lines = [
    line({ id: "a", planned_cents: 500_00 }),
    line({ id: "b", ledger: "equipment", planned_cents: 700_00 }),
    line({ id: "c", ledger: "equipment", planned_cents: 130_00 }),
  ];
  assert.equal(totalsFor(lines, "equipment").planned, 830_00);
});

test("a retained purchase never eats the event ceiling", () => {
  /* The whole reason the ledgers are separate. $60,000 with $55,500 working
     leaves $4,500, and buying a speaker to keep must not change that. */
  const event = [line({ id: "a", planned_cents: 55_500_00 })];
  const withKit = [...event, line({ id: "k", ledger: "equipment", planned_cents: 1_580_00 })];
  assert.equal(
    60_000_00 - totalsFor(event, "event").planned,
    60_000_00 - totalsFor(withKit, "event").planned,
  );
});

test("committed and spent are summed per ledger too", () => {
  const lines = [
    line({ id: "a", committed_cents: 200_00, actual_cents: 150_00 }),
    line({ id: "b", ledger: "equipment", committed_cents: 700_00, actual_cents: 700_00 }),
  ];
  assert.deepEqual(totalsFor(lines, "event"), { planned: 100_00, committed: 200_00, spent: 150_00 });
  assert.deepEqual(totalsFor(lines, "equipment"), { planned: 100_00, committed: 700_00, spent: 700_00 });
});

test("an unknown ledger value is treated as the event's, never dropped", () => {
  /* Losing a line from every total is worse than putting it in the wrong one. */
  assert.equal(totalsFor([line({ ledger: "something-else" })], "event").planned, 100_00);
});

/* -------------------------------------------------------------- overlaps */

test("a flagged line is paired with the line it may already be inside", () => {
  const barista = line({ id: "barista", label: "Barista and espresso equipment", planned_cents: 1_500_00 });
  const machine = line({
    id: "machine", ledger: "equipment", label: "Espresso machine",
    planned_cents: 750_00, review_of: "barista",
  });
  const found = overlaps([barista, machine]);
  assert.equal(found.length, 1);
  assert.equal(found[0].line.id, "machine");
  assert.equal(found[0].against.id, "barista");
});

test("both sides of an overlap keep their own number", () => {
  /* Flagging is not arithmetic. Neither line is adjusted, and the espresso
     machine stays out of the event total because of its ledger, not its
     flag. */
  const barista = line({ id: "barista", planned_cents: 1_500_00 });
  const machine = line({ id: "machine", ledger: "equipment", planned_cents: 750_00, review_of: "barista" });
  assert.equal(totalsFor([barista, machine], "event").planned, 1_500_00);
  assert.equal(totalsFor([barista, machine], "equipment").planned, 750_00);
});

test("a flag pointing at a line that is gone is not half a question", () => {
  assert.deepEqual(overlaps([line({ id: "machine", review_of: "deleted" })]), []);
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
});

test("a negative amount is refused rather than stored", () => {
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
  ledger: "event",
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
  ...over,
});

test("a line nobody can name is not a line", () => {
  assert.equal(shapeLine(entry({ label: "  " })).ok, false);
});

test("an equipment line names its own category when none is given", () => {
  const shaped = shapeLine(entry({ ledger: "equipment", category: "", status: "to_buy" }));
  assert.equal(shaped.ok && shaped.row.category, "Equipment");
});

test("an event line still has to say which category", () => {
  assert.equal(shapeLine(entry({ category: "" })).ok, false);
});

test("a status from the wrong ledger falls back rather than being stored", () => {
  const shaped = shapeLine(entry({ status: "to_buy" }));
  assert.equal(shaped.ok && shaped.row.status, "estimate");
  const kit = shapeLine(entry({ ledger: "equipment", status: "protected" }));
  assert.equal(kit.ok && kit.row.status, "to_buy");
});

test("an unrecognised ledger is stored as the event's", () => {
  const shaped = shapeLine(entry({ ledger: "nonsense" }));
  assert.equal(shaped.ok && shaped.row.ledger, "event");
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
