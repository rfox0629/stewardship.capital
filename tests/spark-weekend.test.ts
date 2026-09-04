import assert from "node:assert/strict";
import test from "node:test";

import {
  pendingBlocks,
  unscheduledIdeas,
  type Placeholder,
  type ScheduledRow,
} from "../lib/spark/weekend.ts";

/**
 * The Weekend canvas, held still.
 *
 * A planner dropped an idea on Friday at eight, then dragged the block it
 * made back to seven, and Spark appeared to copy it: two blocks, one row. The
 * database had been right the whole time. The placeholder drawn at the moment
 * of the drop was retiring itself by asking "is anything still at eight?",
 * and once the real block moved to seven the answer became no, so it drew
 * itself again beside the row it was standing in for.
 *
 * These exercise the real functions the canvas calls.
 */

const at = (minutes: number) => {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const placeholder = (over: Partial<Placeholder> = {}): Placeholder => ({
  key: "k1",
  ideaId: "idea-breakfast",
  day: "fri",
  minutes: 8 * 60,
  id: null,
  ...over,
});

const row = (over: Partial<ScheduledRow> = {}): ScheduledRow => ({
  id: "moment-1",
  day: "fri",
  starts: "8:00 am",
  sparkId: "idea-breakfast",
  ...over,
});

/* --------------------------------------------- the copy that was not a copy */

test("a placeholder is drawn while its row does not exist yet", () => {
  assert.equal(pendingBlocks([placeholder()], [], at).length, 1);
});

test("a placeholder stops being drawn once its own row arrives", () => {
  const entry = placeholder({ id: "moment-1" });
  assert.equal(pendingBlocks([entry], [row()], at).length, 0);
});

test("a placeholder stays retired after its row is moved to another time", () => {
  const entry = placeholder({ id: "moment-1" });
  const moved = [row({ starts: "7:00 am" })];
  assert.deepEqual(pendingBlocks([entry], moved, at), []);
});

test("a placeholder stays retired after its row is moved to another day", () => {
  const entry = placeholder({ id: "moment-1" });
  const moved = [row({ day: "sat", starts: "7:00 am" })];
  assert.deepEqual(pendingBlocks([entry], moved, at), []);
});

test("an in flight placeholder retires on a row for the same idea and hour", () => {
  /* The refreshed data can beat the action's answer back. */
  assert.equal(pendingBlocks([placeholder()], [row()], at).length, 0);
});

test("an in flight placeholder ignores another idea at the same hour", () => {
  const other = [row({ id: "moment-9", sparkId: "idea-worship" })];
  assert.equal(pendingBlocks([placeholder()], other, at).length, 1);
});

test("two occurrences of one idea retire their own placeholders only", () => {
  const friday = placeholder({ key: "k1", id: "moment-1" });
  const saturday = placeholder({ key: "k2", id: "moment-2", day: "sat" });
  const rows = [row({ id: "moment-1" })];
  assert.deepEqual(
    pendingBlocks([friday, saturday], rows, at).map((entry) => entry.key),
    ["k2"],
  );
});

/* ------------------------------------------------- what the overlay offers */

test("an idea with no scheduled moment is still offered", () => {
  assert.equal(unscheduledIdeas([{ scheduled: 0 }]).length, 1);
});

test("an idea that has been scheduled is not offered as unscheduled", () => {
  assert.deepEqual(unscheduledIdeas([{ scheduled: 1 }]), []);
});

test("an idea scheduled several times is not offered either", () => {
  assert.deepEqual(unscheduledIdeas([{ scheduled: 2 }]), []);
});

test("an idea placed inside another moment is not offered either", () => {
  /* A boat ride happening during free time has been placed. It has no moment
     of its own and never will, and offering it as unplaced invites somebody
     to place it twice. */
  assert.deepEqual(unscheduledIdeas([{ scheduled: 1 }]), []);
});

test("only placement hides an idea, never an action or a cost", () => {
  /* Attaching a receipt to an idea does not place it in the weekend, so the
     overlay must keep offering it. Anything else quietly loses ideas. */
  const ideas = [
    { name: "has an action", scheduled: 0 },
    { name: "has a cost", scheduled: 0 },
    { name: "is on the calendar", scheduled: 1 },
  ];
  assert.deepEqual(
    unscheduledIdeas(ideas).map((idea) => idea.name),
    ["has an action", "has a cost"],
  );
});
