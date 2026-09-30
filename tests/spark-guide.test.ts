import assert from "node:assert/strict";
import test from "node:test";

import {
  byPhase,
  clock,
  coffeeHoursByDay,
  dayAgenda,
  detailCue,
  dutiesFor,
  everyoneIn,
  guestTitle,
  peopleOf,
  readActivities,
  readCoffeeHours,
  readDrinks,
  readGuestCopy,
  readOps,
  readRoster,
  readScheduledActivities,
  scheduledActivities,
  hasDetail,
  categoryOf,
  clockRange,
  leadsOf,
  personalAgenda,
  personalOverlaps,
  rosterOf,
  timingConflicts,
  UNASSIGNED,
  type GuideMoment,
} from "../lib/spark/guide.ts";

/**
 * The weekend guide, held still.
 *
 * Guests and the team read the same calendar. These cover the rules that
 * decide what each reads: order, labels, who a duty belongs to, and which
 * moments collide after somebody moves one.
 */

const moment = (over: Partial<GuideMoment> = {}): GuideMoment => ({
  id: "m1",
  day: "fri",
  starts: "9:00 am",
  ends: null,
  title: "Worship",
  location: null,
  window: false,
  guide: null,
  ...over,
});

/* ---------------------------------------------------------------- times */

test("a clock time prints the way the schedule does", () => {
  assert.equal(clock("7:30 am"), "7:30 AM");
  assert.equal(clock("12:00 pm"), "12:00 PM");
  assert.equal(clock("5 pm"), "5:00 PM");
  assert.equal(clock(null), "");
});

/* --------------------------------------------------------------- agenda */

test("a day reads in the order it happens", () => {
  const day = dayAgenda(
    [
      moment({ id: "lunch", starts: "12:00 pm", title: "Lunch" }),
      moment({ id: "bkfst", starts: "7:30 am", title: "Breakfast" }),
      moment({ id: "sat", day: "sat", starts: "6:00 am", title: "Elsewhere" }),
    ],
    "fri",
  );
  assert.deepEqual(day.map((m) => m.id), ["bkfst", "lunch"]);
});

test("free time appears where it begins, and what happens inside it follows", () => {
  const day = dayAgenda(
    [
      moment({ id: "bingo", starts: "2:00 pm", title: "Bingo" }),
      moment({ id: "free", starts: "1:00 pm", ends: "5:00 pm", title: "Free time", window: true }),
      moment({ id: "coffee", starts: "4:00 pm", title: "Open coffee bar" }),
    ],
    "fri",
  );
  assert.deepEqual(day.map((m) => m.id), ["free", "bingo", "coffee"]);
});

test("at the same minute a window reads first, because it is the frame", () => {
  const day = dayAgenda(
    [
      moment({ id: "game", starts: "1:00 pm", title: "A game" }),
      moment({ id: "free", starts: "1:00 pm", title: "Free time", window: true }),
    ],
    "fri",
  );
  assert.deepEqual(day.map((m) => m.id), ["free", "game"]);
});

/* ------------------------------------------------------------ guest copy */

test("a guest reads the guest title when the calendar's is written for the team", () => {
  const cleanup = moment({ title: "Clean up and get ready for worship", guide: { title: "Get ready for worship" } });
  assert.equal(guestTitle(cleanup), "Get ready for worship");
  assert.equal(guestTitle(moment()), "Worship");
});

test("a meal says Menu, free time says Activities, the coffee bar says Coffee menu", () => {
  assert.equal(detailCue(moment({ guide: { menu: ["Brisket"] } })), "Menu");
  assert.equal(detailCue(moment({ guide: { opens: ["activities"] } })), "Activities");
  assert.equal(detailCue(moment({ guide: { opens: ["coffee", "activities"] } })), "Coffee menu");
  assert.equal(detailCue(moment({ guide: { summary: "Optional" } })), "Details");
  assert.equal(detailCue(moment()), null);
});

test("guest copy from the database keeps only what it can recognise", () => {
  const copy = readGuestCopy({
    kind: "meal",
    menu: ["Brisket", "", 7, "Rolls"],
    opens: ["coffee", "run of show", "activities"],
    owner: "should not survive",
  });
  assert.deepEqual(copy?.menu, ["Brisket", "Rolls"]);
  assert.deepEqual(copy?.opens, ["coffee", "activities"]);
  assert.equal("owner" in (copy ?? {}), false);
  assert.equal(readGuestCopy(null), null);
  assert.equal(readGuestCopy(["not", "an", "object"]), null);
});

test("an empty operations record reads as nothing, not as blanks", () => {
  assert.equal(readOps({}), null);
  assert.equal(readOps({ owner: "  " }), null);
  assert.equal(readOps({ owner: "Brooke" })?.owner, "Brooke");
});

test("activities and drinks without a name are dropped rather than drawn empty", () => {
  assert.equal(readActivities([{ name: "Kayaks", category: "Water" }, { category: "Water" }]).length, 1);
  assert.equal(readDrinks([{ name: "Honeycomb", ingredients: ["Espresso"] }, { feel: "x" }]).length, 1);
});

test("coffee hours are read as days, in the order the weekend happens", () => {
  /* Two windows on the Friday, and the days arriving out of order, which is
     how an aggregate can come back. Each day is one heading. */
  const hours = readCoffeeHours([
    { day: "sat", starts: "4:00 pm", ends: "5:00 pm" },
    { day: "fri", starts: "10:15 am", ends: "10:30 am" },
    { day: "fri", starts: "4:00 pm", ends: "5:00 pm" },
  ]);
  assert.deepEqual(coffeeHoursByDay(hours), [
    ["fri", [
      { day: "fri", starts: "10:15 am", ends: "10:30 am" },
      { day: "fri", starts: "4:00 pm", ends: "5:00 pm" },
    ]],
    ["sat", [{ day: "sat", starts: "4:00 pm", ends: "5:00 pm" }]],
  ]);
});

test("a coffee window with no closing time is not printed open-ended", () => {
  /* "Friday, from 4:00" invites somebody to turn up at six. A window the
     calendar has not finished is left off until it has been. */
  assert.equal(readCoffeeHours([{ day: "fri", starts: "4:00 pm" }]).length, 0);
  assert.equal(readCoffeeHours([{ day: "fri", ends: "5:00 pm" }]).length, 0);
  assert.equal(readCoffeeHours([{ starts: "4:00 pm", ends: "5:00 pm" }]).length, 0);
  assert.deepEqual(coffeeHoursByDay(readCoffeeHours("not a list")), []);
});

/* --------------------------------------------------------------- duties */

test("a team written the way people talk is read as people", () => {
  assert.deepEqual(peopleOf("Alice, Keta, Emma & Scott"), ["Alice", "Keta", "Emma", "Scott"]);
  assert.deepEqual(peopleOf("Ryan & Brooke & Junior"), ["Ryan", "Brooke", "Junior"]);
  assert.deepEqual(peopleOf("Mike and Victor"), ["Mike", "Victor"]);
  assert.deepEqual(peopleOf("Keta"), ["Keta"]);
});

test("an unassigned duty is its own bucket, so it is never lost", () => {
  assert.deepEqual(peopleOf("To assign"), [UNASSIGNED]);
  assert.deepEqual(peopleOf(null), [UNASSIGNED]);
  assert.deepEqual(peopleOf("  "), [UNASSIGNED]);
});

test("a name that contains 'and' is not split in half", () => {
  assert.deepEqual(peopleOf("Alexander & Sandra"), ["Alexander", "Sandra"]);
});

const duties = [
  { id: "1", owner: "Alice", phase: "fri", order: 33, title: "Clean bathrooms" },
  { id: "2", owner: "Keta", phase: "fri", order: 37, title: "Clean bathrooms" },
  { id: "3", owner: "Emma", phase: "sat", order: 40, title: "Clean bathrooms" },
  { id: "4", owner: "Scott", phase: "sat", order: 44, title: "Clean bathrooms" },
  { id: "5", owner: "Alice, Keta, Emma & Scott", phase: "fri", order: 34, title: "Clean up after breakfast" },
  { id: "6", owner: "To assign", phase: "sun", order: 52, title: "Final cleanup" },
  { id: "7", owner: "Emma", phase: "before", order: 4, title: "Name tags" },
];

test("the bathroom rotation reads back exactly as assigned", () => {
  const rotation = duties
    .filter((duty) => duty.title === "Clean bathrooms")
    .map((duty) => `${duty.phase}:${duty.owner}`);
  assert.deepEqual(rotation, ["fri:Alice", "fri:Keta", "sat:Emma", "sat:Scott"]);
});

test("choosing a person shows their own duties and shared ones", () => {
  assert.deepEqual(dutiesFor(duties, "Keta").map((d) => d.id), ["2", "5"]);
  assert.deepEqual(dutiesFor(duties, "Scott").map((d) => d.id), ["4", "5"]);
});

test("choosing nobody shows everything", () => {
  assert.equal(dutiesFor(duties, null).length, duties.length);
});

test("everyone named anywhere is offered, with the unassigned bucket last", () => {
  assert.deepEqual(everyoneIn(duties), ["Alice", "Emma", "Keta", "Scott", UNASSIGNED]);
});

test("duties read by phase in the order the weekend happens", () => {
  const groups = byPhase(duties);
  assert.deepEqual(groups.map((g) => g.phase), ["before", "fri", "sat", "sun"]);
  assert.deepEqual(groups[1].duties.map((d) => d.id), ["1", "5", "2"]);
});

/* ------------------------------------------------------------ conflicts */

test("a moment that starts inside another is flagged on both", () => {
  const found = timingConflicts([
    moment({ id: "reset", starts: "6:30 pm", ends: "7:00 pm" }),
    moment({ id: "impact", starts: "6:50 pm" }),
  ]);
  assert.deepEqual(found.get("reset"), ["impact"]);
  assert.deepEqual(found.get("impact"), ["reset"]);
});

test("moments that simply follow each other are not a conflict", () => {
  const found = timingConflicts([
    moment({ id: "a", starts: "5:00 pm", ends: "5:30 pm" }),
    moment({ id: "b", starts: "5:30 pm", ends: "6:30 pm" }),
  ]);
  assert.equal(found.size, 0);
});

test("something inside free time is not a conflict: that is what free time is for", () => {
  const found = timingConflicts([
    moment({ id: "free", starts: "1:00 pm", ends: "5:00 pm", window: true }),
    moment({ id: "bingo", starts: "2:00 pm", ends: "3:00 pm" }),
  ]);
  assert.equal(found.size, 0);
});

test("two moments at the same minute collide, even without end times", () => {
  const found = timingConflicts([
    moment({ id: "a", starts: "7:00 pm" }),
    moment({ id: "b", starts: "7:00 pm" }),
  ]);
  assert.deepEqual(found.get("a"), ["b"]);
});

test("the same times on different days never collide", () => {
  const found = timingConflicts([
    moment({ id: "a", day: "fri", starts: "7:00 pm", ends: "8:00 pm" }),
    moment({ id: "b", day: "sat", starts: "7:00 pm", ends: "8:00 pm" }),
  ]);
  assert.equal(found.size, 0);
});

test("a move that lands one moment on another is caught", () => {
  const before = [
    moment({ id: "dinner", starts: "5:30 pm", ends: "6:30 pm" }),
    moment({ id: "worship", starts: "7:00 pm", ends: "7:50 pm" }),
  ];
  assert.equal(timingConflicts(before).size, 0);
  const moved = before.map((m) => (m.id === "worship" ? { ...m, starts: "6:00 pm", ends: "6:50 pm" } : m));
  assert.deepEqual(timingConflicts(moved).get("worship"), ["dinner"]);
});

/* ------------------------------------------------- one person's weekend */

const run = (
  day: string,
  starts: string,
  ends: string | null,
  title: string,
  owner: string,
  support: string,
  over: Partial<GuideMoment> = {},
): GuideMoment =>
  moment({
    id: `${day}-${starts}-${title}`,
    day,
    starts,
    ends,
    title,
    ops: { owner, support, category: "operations" },
    ...over,
  });

const WEEKEND: GuideMoment[] = [
  run("fri", "9:00 am", "9:20 am", "Worship", "JonCarlos", "Scott audio; Junior AV and coverage",
    { ops: { owner: "JonCarlos", support: "Scott audio; Junior AV and coverage", category: "program" } }),
  run("fri", "11:30 am", "12:00 pm", "Word from Sammy and Suzanne", "Sammy and Suzanne",
    "Ryan transition; Junior coverage",
    { ops: { owner: "Sammy and Suzanne", support: "Ryan transition; Junior coverage", category: "program" } }),
  run("fri", "11:30 am", "12:00 pm", "Morning bathroom cleaning", "Alice", "Scott"),
  run("fri", "11:45 am", "12:15 pm", "AV reset", "Junior", "Scott"),
  run("fri", "9:20 am", "9:30 am", "Devotional", "Tito", "Scott"),
  run("fri", "12:00 pm", "1:00 pm", "Lunch", "Brooke", "Catering Team"),
  run("fri", "12:45 pm", "1:15 pm", "Lunch cleanup", "Keta", "Alice, Keta, Emma and Scott"),
  run("thu", "12:00 pm", "1:00 pm", "Team lunch", "Brooke", "Full team"),
];

test("the roster comes from the leads, who are written plainly", () => {
  assert.deepEqual(rosterOf(WEEKEND), [
    "Alice", "Brooke", "JonCarlos", "Junior", "Keta", "Sammy", "Suzanne", "Tito",
  ]);
});

test("somebody named on the engagement can be chosen, if these rows mention them", () => {
  /* Scott and Emma are on team lines here and lead nothing, which is the
     position Johnny was in: a schedule, and no way to ask for it. */
  assert.equal(rosterOf(WEEKEND).includes("Scott"), false, "not offered unnamed");
  assert.deepEqual(rosterOf(WEEKEND, ["Scott", "Emma"]), [
    "Alice", "Brooke", "Emma", "JonCarlos", "Junior", "Keta", "Sammy", "Scott", "Suzanne", "Tito",
  ]);

  /* Once chosen, the schedule that was always theirs is there. */
  assert.ok(personalAgenda(WEEKEND, "Scott").some((entry) => entry.moment.title === "Lunch cleanup"));
});

test("a written name offers nobody who is on nothing, and nobody twice", () => {
  /* Naming a person does not put them on the weekend. */
  assert.equal(rosterOf(WEEKEND, ["Oakley"]).includes("Oakley"), false);
  /* A lead who is also written down is one person, however it is cased. */
  assert.equal(rosterOf(WEEKEND, ["keta", "Keta"]).filter((name) => /keta/i.test(name)).length, 1);
  /* The team column's own words are never offered, named or not. */
  assert.equal(rosterOf(WEEKEND, []).includes("coverage"), false);
});

test("a roster is names, and whatever else was stored is dropped", () => {
  assert.deepEqual(readRoster(["Johnny", " Axel ", "", 4, null, { name: "x" }]), ["Johnny", "Axel"]);
  assert.deepEqual(readRoster("Johnny"), []);
  assert.deepEqual(readRoster(undefined), []);
});

test("a compound lead is two people, and the wording is left alone", () => {
  const sammy = personalAgenda(WEEKEND, "Sammy");
  const suzanne = personalAgenda(WEEKEND, "Suzanne");
  assert.equal(sammy.length, 2, "the word plus the shared team lunch");
  assert.equal(sammy[0].involvement, "leading");
  assert.equal(sammy[0].because, "Sammy and Suzanne", "shown as the source wrote it");
  assert.equal(suzanne[0].involvement, "leading");
});

test("a supporting clause is read as support, and a transition says so", () => {
  const ryan = personalAgenda(WEEKEND, "Ryan");
  const entry = ryan.find((item) => item.moment.title.startsWith("Word from"));
  assert.equal(entry?.involvement, "transition");
  assert.equal(entry?.because, "Ryan transition");

  const junior = personalAgenda(WEEKEND, "Junior");
  assert.equal(junior[0].involvement, "assigned");
  assert.equal(junior[0].because, "Junior AV and coverage");
});

test("a vague group is never expanded into people", () => {
  /* Nobody is quietly made a member of the catering team. */
  assert.equal(rosterOf(WEEKEND).includes("Catering Team"), false, "not a person");
  for (const person of ["Keta", "Scott", "Emma"]) {
    const lunch = personalAgenda(WEEKEND, person).find((entry) => entry.moment.title === "Lunch");
    assert.equal(lunch, undefined, `${person} is not quietly made catering`);
  }
  const brooke = personalAgenda(WEEKEND, "Brooke");
  assert.equal(brooke.find((entry) => entry.moment.title === "Lunch")?.involvement, "leading");
});

test("full team commitments are shared, and reach everyone", () => {
  for (const person of ["Scott", "Keta", "Junior"]) {
    const shared = personalAgenda(WEEKEND, person).find((entry) => entry.moment.title === "Team lunch");
    assert.equal(shared?.involvement, "team", person);
  }
});

test("a person's day is in time order", () => {
  const scott = personalAgenda(WEEKEND, "Scott").filter((entry) => entry.moment.day === "fri");
  assert.deepEqual(scott.map((entry) => entry.moment.starts),
    ["9:00 am", "9:20 am", "11:30 am", "11:45 am", "12:45 pm"]);
});

test("competing responsibilities are flagged; a handoff is not", () => {
  const scott = personalAgenda(WEEKEND, "Scott");
  const clash = personalOverlaps(scott);
  const bathrooms = scott.find((entry) => entry.moment.title.startsWith("Morning bathroom"))!;
  const av = scott.find((entry) => entry.moment.title === "AV reset")!;
  assert.deepEqual(clash.get(bathrooms.moment.id), [av.moment.id], "11:45 lands inside 11:30 to 12:00");

  /* Worship ends at 9:20 and the devotional begins at 9:20. That is a handoff,
     and Scott is on both without any clash. */
  const worship = scott.find((entry) => entry.moment.title === "Worship")!;
  const devotional = scott.find((entry) => entry.moment.title === "Devotional")!;
  assert.equal(clash.has(worship.moment.id), false);
  assert.equal(clash.has(devotional.moment.id), false);

  /* Lunch cleanup starts at 12:45 while lunch runs to 1:00, but Keta is not
     on lunch: one view showing both is not two assignments. */
  assert.equal(personalOverlaps(personalAgenda(WEEKEND, "Keta")).size, 0);
});

test("free time and optional activities are not conflicts", () => {
  const withFree = [
    ...WEEKEND,
    run("fri", "1:00 pm", "4:00 pm", "Free time", "Brooke", "As needed",
      { guide: { kind: "free" } }),
    run("fri", "2:00 pm", "4:00 pm", "Bingo", "Brooke", "Keta and Emma",
      { guide: { kind: "game", optional: true } }),
  ];
  const brooke = personalAgenda(withFree, "Brooke");
  assert.equal(personalOverlaps(brooke).size, 0);
});

test("a row shown in two views is still one assignment", () => {
  const keta = personalAgenda(WEEKEND, "Keta");
  const ids = keta.map((entry) => entry.moment.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the category decides the badge, and defaults to operations", () => {
  assert.equal(categoryOf(WEEKEND[0]), "program");
  assert.equal(categoryOf(WEEKEND[3]), "operations");
  assert.equal(categoryOf(moment({})), "operations");
});

test("a confirm flag left in the data draws nothing", () => {
  /* The warning banners are gone. A flag still sitting in an old ops payload
     is read straight past rather than rendered, so no row can bring the wall
     of "Assignment to confirm" back on its own. */
  const parsed = readOps({ purpose: "x", category: "program", confirm: "time" });
  assert.equal(parsed?.category, "program");
  assert.ok(parsed && !("confirm" in parsed));
});

test("two candidates for one job are both offered the row, as written", () => {
  /* The sheet says "Mike or Brooke" because it has not been settled. The
     wording stays exactly that on screen; the filter offers it to each of
     them rather than to neither. */
  assert.deepEqual(leadsOf("Mike or Brooke"), ["Mike", "Brooke"]);
  assert.deepEqual(leadsOf("Mike and Ryan"), ["Mike", "Ryan"]);

  const sector = moment({
    id: "sector", day: "wed", starts: "6:30 pm", ends: "7:00 pm",
    title: "Sector Assignment",
    ops: { category: "operations", owner: "Mike or Brooke" },
  });
  for (const name of ["Mike", "Brooke"]) {
    const mine = personalAgenda([sector], name);
    assert.equal(mine.length, 1, name);
    assert.equal(mine[0].involvement, "leading");
  }
  assert.equal(personalAgenda([sector], "Keta").length, 0, "nobody else is assigned it");
});

test("a window reads as one line, and says the meridiem once where it can", () => {
  assert.deepEqual(clockRange("7:30 am", "9:00 am"), { value: "7:30–9:00", meridiem: "AM" });
  assert.deepEqual(clockRange("12:00 pm", "1:00 pm"), { value: "12:00–1:00", meridiem: "PM" });
  assert.deepEqual(clockRange("11:30 am", "12:00 pm"),
    { value: "11:30 AM–12:00 PM", meridiem: null });

  /* No end is no end. Nothing is borrowed from whatever comes next. */
  assert.deepEqual(clockRange("4:00 pm", null), { value: "4:00", meridiem: "PM" });
  assert.deepEqual(clockRange("6:00 pm", ""), { value: "6:00", meridiem: "PM" });
  assert.deepEqual(clockRange(null, "9:00 am"), { value: "", meridiem: null });
});

/* ------------------------------------------------- scheduled activities */

test("scheduled activities keep a name, a day and times, and nothing else", () => {
  const read = readScheduledActivities([
    { id: "b", day: "fri", starts: "2:00 pm", ends: "4:00 pm", title: "Bingo", owner: "Ryan", notes: "Prep at 1" },
    { id: "x", day: "sat", title: "No start" },
    { id: "w", day: "sat", starts: "1:00 pm", title: "Prayer Walk" },
    "nonsense",
  ]);
  assert.deepEqual(read, [
    { id: "b", day: "fri", starts: "2:00 pm", ends: "4:00 pm", title: "Bingo" },
    { id: "w", day: "sat", starts: "1:00 pm", ends: null, title: "Prayer Walk" },
  ]);
  assert.deepEqual(readScheduledActivities(null), []);
});

test("the Activities tab lists every scheduled activity by day, in time order, once", () => {
  const bingo = { id: "b", day: "fri", starts: "2:00 pm", ends: "4:00 pm", title: "Bingo of Wanyonyi's favorite things" };
  const walk = { id: "w", day: "sat", starts: "1:00 pm", ends: "2:00 pm", title: "Prayer Walk" };
  const cornhole = { id: "c", day: "sat", starts: "2:00 pm", ends: "4:00 pm", title: "Cornhole Tournament" };
  const groups = scheduledActivities([
    moment({ id: "sat-free", day: "sat", activities: [cornhole, walk] }),
    moment({ id: "fri-free", day: "fri", activities: [bingo] }),
    moment({ id: "again", day: "sat", activities: [walk] }),
    moment({ id: "lunch", day: "sat" }),
  ]);
  assert.deepEqual(groups, [
    { day: "fri", activities: [bingo] },
    { day: "sat", activities: [walk, cornhole] },
  ]);
  assert.deepEqual(scheduledActivities([moment()]), []);
});

test("a block with scheduled activities opens like a menu, under Activities", () => {
  const walk = { id: "w", day: "sat", starts: "1:00 pm", ends: "2:00 pm", title: "Prayer Walk" };
  const free = moment({ guide: { kind: "free", opens: ["activities"] }, activities: [walk] });
  assert.equal(hasDetail(free), true);
  assert.equal(detailCue(free), "Activities");
  /* A line that borrows no guest copy is not offered as a tap at all. */
  assert.equal(hasDetail(moment({ guide: null, activities: [walk] })), false,
    "a line with no guest copy stays plain");
});
