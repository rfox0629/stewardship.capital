import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteIdeaRefusal,
  ideasStillOpen,
  pendingBlocks,
  repeatScheduleRefusal,
  timedOn,
  type Leaving,
  type Placeholder,
  type ScheduledRow,
} from "../lib/spark/weekend.ts";

/**
 * The Weekend canvas, held still.
 *
 * USA-263. An idea dragged onto Thursday stayed in the bank beside its own
 * card. Removing the card left it on the calendar. Deleting the idea after
 * that left the card there too. The database was clean the whole time; every
 * one of those was the screen remembering something the server had already
 * answered. These exercise the real functions the canvas calls.
 */

const at = (minutes: number) => {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const row = (over: Partial<ScheduledRow> = {}): ScheduledRow => ({
  id: "moment-1",
  day: "thu",
  starts: "9:30 am",
  sparkId: "idea-hors",
  ...over,
});

const placeholder = (basis: unknown, over: Partial<Placeholder> = {}): Placeholder => ({
  key: "k1",
  ideaId: "idea-hors",
  day: "thu",
  minutes: 9 * 60 + 30,
  id: null,
  basis,
  ...over,
});

type Idea = { id: string; state: string; schedule: unknown[]; inMoments: unknown[] };

const idea = (over: Partial<Idea> = {}): Idea => ({
  id: "idea-hors",
  state: "open",
  schedule: [],
  inMoments: [],
  ...over,
});

/* ------------------------------------------ 1. drag idea onto the calendar */

test("a dropped idea leaves the bank at once, before the server answers", () => {
  const bank = [idea(), idea({ id: "idea-tags" })];
  const leaving: Leaving[] = [{ id: "idea-hors", basis: bank }];
  assert.deepEqual(ideasStillOpen(bank, leaving).map((i) => i.id), ["idea-tags"]);
});

test("a dropped idea draws a card at once, before the server answers", () => {
  const before: ScheduledRow[] = [];
  assert.equal(pendingBlocks([placeholder(before)], before, at).length, 1);
});

/* --------------------------------------------------- 2. refresh the page */

test("after the server answers, the idea stays out of the bank because it is scheduled", () => {
  const before = [idea()];
  const after = [idea({ schedule: [{ id: "moment-1" }] })];
  const leaving: Leaving[] = [{ id: "idea-hors", basis: before }];
  assert.deepEqual(ideasStillOpen(after, leaving), []);
});

test("after the server answers, the real row is drawn and the placeholder is not", () => {
  const before: ScheduledRow[] = [];
  const after = [row()];
  assert.deepEqual(pendingBlocks([placeholder(before, { id: "moment-1" })], after, at), []);
});

test("a full reload carries no memory at all, so only the server's state shows", () => {
  assert.deepEqual(ideasStillOpen([idea({ schedule: [{}] })]), []);
  assert.deepEqual(pendingBlocks([], [row()], at), []);
});

/* ------------------------------------------ 3. unschedule the linked moment */

test("unscheduling returns the idea to the bank", () => {
  const scheduled = [idea({ schedule: [{ id: "moment-1" }] })];
  const unscheduled = [idea()];
  const staleHold: Leaving[] = [{ id: "idea-hors", basis: scheduled }];
  assert.deepEqual(ideasStillOpen(unscheduled, staleHold).map((i) => i.id), ["idea-hors"]);
});

test("an unscheduled idea comes back exactly once, however many times it was dropped", () => {
  const first = [idea()];
  const second = [idea({ schedule: [{}] })];
  const now = [idea()];
  const holds: Leaving[] = [
    { id: "idea-hors", basis: first },
    { id: "idea-hors", basis: second },
  ];
  assert.equal(ideasStillOpen(now, holds).length, 1);
});

test("a failed save puts the idea straight back once the server answers", () => {
  const before = [idea()];
  const after = [idea()];
  assert.equal(ideasStillOpen(after, [{ id: "idea-hors", basis: before }]).length, 1);
});

/* -------------------------------------- 4. delete an idea that is scheduled */

test("deleting a scheduled idea is refused, so no orphan card can be left behind", () => {
  const refusal = deleteIdeaRefusal({ schedule: 1, tasks: 0, resources: 0, costs: 0, cues: 0 });
  assert.ok(refusal);
  assert.match(refusal, /Unschedule it first/);
});

test("the refusal names every time it is on the calendar", () => {
  const refusal = deleteIdeaRefusal({ schedule: 2, tasks: 0, resources: 0, costs: 0, cues: 0 });
  assert.match(refusal ?? "", /2 times/);
});

test("the calendar is named before anything else holding the idea", () => {
  const refusal = deleteIdeaRefusal({ schedule: 1, tasks: 3, resources: 1, costs: 2, cues: 1 });
  assert.match(refusal ?? "", /on the calendar/);
});

test("an idea placed inside a moment is refused too", () => {
  assert.match(
    deleteIdeaRefusal({ schedule: 0, tasks: 0, resources: 0, costs: 0, cues: 1 }) ?? "",
    /inside a moment/,
  );
});

test("an idea with nothing linked can be deleted", () => {
  assert.equal(deleteIdeaRefusal({ schedule: 0, tasks: 0, resources: 0, costs: 0, cues: 0 }), null);
});

/* ------------------------------- 5. delete or unschedule, then refresh */

test("a removed moment's placeholder never comes back as a ghost card", () => {
  /* The USA-263 ghost. The placeholder knew its row's id; the row was then
     removed. The old rule drew it again because its row was missing. */
  const dropped: ScheduledRow[] = [];
  const afterSave = [row()];
  const afterRemove: ScheduledRow[] = [];
  const entry = placeholder(dropped, { id: "moment-1" });
  assert.deepEqual(pendingBlocks([entry], afterSave, at), []);
  assert.deepEqual(pendingBlocks([entry], afterRemove, at), []);
});

test("a placeholder is finished once the server answers, even if its row is missing", () => {
  const dropped: ScheduledRow[] = [];
  const answered: ScheduledRow[] = [];
  assert.deepEqual(pendingBlocks([placeholder(dropped, { id: "moment-1" })], answered, at), []);
});

test("an in flight placeholder is finished by any answer, not only a matching one", () => {
  const dropped: ScheduledRow[] = [];
  const answered = [row({ id: "moment-9", sparkId: "idea-worship" })];
  assert.deepEqual(pendingBlocks([placeholder(dropped)], answered, at), []);
});

test("while still waiting, a placeholder with its id stands in for the row", () => {
  const shown: ScheduledRow[] = [];
  assert.equal(pendingBlocks([placeholder(shown, { id: "moment-1" })], shown, at).length, 1);
});

/* ---------------------------------------------- the copy that was not a copy */

test("a placeholder stays retired after its row is moved to another time", () => {
  const dropped: ScheduledRow[] = [];
  const moved = [row({ starts: "7:00 am" })];
  assert.deepEqual(pendingBlocks([placeholder(dropped, { id: "moment-1" })], moved, at), []);
});

test("a placeholder stays retired after its row is moved to another day", () => {
  const dropped: ScheduledRow[] = [];
  const moved = [row({ day: "sat", starts: "7:00 am" })];
  assert.deepEqual(pendingBlocks([placeholder(dropped, { id: "moment-1" })], moved, at), []);
});

test("while waiting, two drops of one idea each stand in for their own row", () => {
  const shown = [row({ id: "moment-1" })];
  const friday = placeholder(shown, { key: "k1", id: "moment-1" });
  const saturday = placeholder(shown, { key: "k2", id: "moment-2", day: "sat" });
  assert.deepEqual(pendingBlocks([friday, saturday], shown, at).map((e) => e.key), ["k2"]);
});

/* ---------------------------------- 6. repeated drops make no duplicate rows */

test("a second drag of an idea already on the calendar is refused", () => {
  assert.ok(repeatScheduleRefusal({ existing: 1, another: false }));
});

test("the first drag of an idea is allowed", () => {
  assert.equal(repeatScheduleRefusal({ existing: 0, another: false }), null);
});

test("another time asked for from inside the idea is allowed on purpose", () => {
  assert.equal(repeatScheduleRefusal({ existing: 1, another: true }), null);
});

test("an idea already dropped cannot be offered for a second drag before the server answers", () => {
  const bank = [idea()];
  assert.deepEqual(ideasStillOpen(bank, [{ id: "idea-hors", basis: bank }]), []);
});

/* --------------------------------- 7. the grid and the day view agree */

test("the weekend grid and the single day read the same moments for a day", () => {
  type M = { id: string; day: string; minutes: number | null };
  const merged: M[] = [
    { id: "a", day: "thu", minutes: 570 },
    { id: "b", day: "thu", minutes: null },
    { id: "c", day: "fri", minutes: 480 },
  ];
  const grid = timedOn(merged, "thu").map((m) => m.id);
  const phone = timedOn(merged, "thu").map((m) => m.id);
  assert.deepEqual(grid, ["a"]);
  assert.deepEqual(phone, grid);
});

test("a block mid drag is shown in the lane it is being dragged over", () => {
  type M = { id: string; day: string; minutes: number | null };
  const merged: M[] = [{ id: "a", day: "thu", minutes: 570 }];
  const dragging = (m: M) => (m.id === "a" ? "fri" : m.day);
  assert.deepEqual(timedOn(merged, "thu", dragging), []);
  assert.deepEqual(timedOn(merged, "fri", dragging).map((m) => m.id), ["a"]);
});

test("an untimed moment is on neither view's clock", () => {
  assert.deepEqual(timedOn([{ day: "sun", minutes: null }], "sun"), []);
});

/* -------------------------------------------------- what the bank offers */

test("an idea that became a moment is not offered", () => {
  assert.deepEqual(ideasStillOpen([idea({ schedule: [{}] })]), []);
});

test("an idea happening inside another moment is not offered either", () => {
  assert.deepEqual(ideasStillOpen([idea({ inMoments: [{}] })]), []);
});

test("an idea set aside is not offered", () => {
  assert.deepEqual(ideasStillOpen([idea({ state: "aside" })]), []);
});

test("only placement removes an idea from the bank, never an action or a cost", () => {
  assert.equal(ideasStillOpen([idea(), idea({ id: "idea-2" })]).length, 2);
});
