/**
 * The rules the Weekend canvas kept getting wrong.
 *
 * Every one of these is a decision about what to draw or what to allow, every
 * one is pure, and every one broke in a way that looked like data loss when it
 * was tangled up in the view. They live here so a test can hold them still.
 *
 * The rule underneath all of them: anything drawn optimistically stands in
 * only until the server's next answer. After that the server is the only
 * truth, and nothing the client remembers may bring a card back or keep an
 * idea hidden.
 */

/** A moment as the canvas knows it: an id, a day, a start, and its idea. */
export type ScheduledRow = {
  id: string;
  day: string;
  starts: string | null;
  sparkId: string | null;
};

/** A block drawn the instant an idea is dropped, before its row exists. */
export type Placeholder = {
  key: string;
  ideaId: string;
  day: string;
  minutes: number;
  /** The row it became, once the server has said which one. */
  id: string | null;
  /** The moments the canvas was showing when it was dropped. When a newer set
   *  arrives, the server has answered and the placeholder has nothing left to
   *  stand in for. Compared by identity, never by contents. */
  basis: unknown;
};

/**
 * Which placeholders are still worth drawing.
 *
 * A placeholder stands in for one row between the drop and the server's next
 * answer, and not a moment longer. Two earlier versions of this got that
 * wrong in opposite directions:
 *
 * Retiring it when something existed at the hour it was dropped on meant that
 * dragging the new block elsewhere left nothing at the old hour, so the
 * placeholder drew itself again beside the row: a copy that was not a copy.
 *
 * Retiring it while its row existed fixed that and broke the reverse. Remove
 * the moment and the row is gone, so the placeholder decided it was needed
 * again, and the card stayed on the calendar after being removed. Deleting the
 * idea afterwards left it there too. That is USA-263.
 *
 * So a placeholder is drawn only while the canvas is still showing the moments
 * it was dropped onto, and only while no row has arrived for it. Once a newer
 * set of moments arrives it is finished, whatever that set contains, and it
 * can never come back.
 */
export const pendingBlocks = <T extends Placeholder>(
  placed: readonly T[],
  moments: readonly ScheduledRow[],
  label: (minutes: number) => string,
): T[] => {
  const byId = new Set(moments.map((moment) => moment.id));
  const byPlacement = new Set(
    moments
      .filter((moment) => moment.sparkId && moment.starts)
      .map((moment) => `${moment.sparkId}|${moment.day}|${moment.starts}`),
  );

  return placed.filter((entry) => {
    if (entry.basis !== moments) return false;
    if (entry.id) return !byId.has(entry.id);
    return !byPlacement.has(`${entry.ideaId}|${entry.day}|${label(entry.minutes)}`);
  });
};

/** An idea taken out of the bank the moment it was scheduled. */
export type Leaving = {
  id: string;
  /** The ideas the bank was showing at the time. Same rule as a placeholder:
   *  once a newer set arrives, the server decides. */
  basis: unknown;
};

/**
 * Which ideas are still only ideas.
 *
 * The bank answers one question: what have we not put into the weekend yet.
 * An idea that has become a moment of its own, or that happens inside
 * somebody else's, has an answer either way and stops being offered.
 *
 * Placement is the only test. An idea with an action, a cost or a requirement
 * is still unplaced, and hiding it because somebody attached a receipt to it
 * would quietly lose it. An idea set aside is not offered either.
 *
 * An idea just dropped onto the calendar leaves the bank immediately rather
 * than waiting for the server, which is what used to leave it sitting there
 * beside its own card. It is held out only until the server answers. After
 * that, if the server says it is still unscheduled, because the save failed
 * or it was unscheduled since, it is back in the bank exactly once.
 */
export const ideasStillOpen = <
  T extends {
    id: string;
    state: string;
    schedule: readonly unknown[];
    inMoments: readonly unknown[];
  },
>(
  ideas: readonly T[],
  leaving: readonly Leaving[] = [],
): T[] => {
  const held = new Set(
    leaving.filter((entry) => entry.basis === ideas).map((entry) => entry.id),
  );
  return ideas.filter(
    (idea) =>
      idea.state === "open" &&
      idea.schedule.length === 0 &&
      idea.inMoments.length === 0 &&
      !held.has(idea.id),
  );
};

/**
 * Whether a second time on the calendar is on purpose.
 *
 * One idea can legitimately happen more than once: the same worship slot on
 * Friday and Saturday. That is a decision made from inside the idea. A drag
 * from the bank is not that decision, and a second drag of something already
 * scheduled, from a stale screen or a double drop, is the duplicate the
 * calendar must never quietly make.
 */
export const repeatScheduleRefusal = ({
  existing,
  another,
}: {
  existing: number;
  another: boolean;
}): string | null =>
  existing > 0 && !another
    ? "That idea is already on the calendar. Open it to add another time on purpose."
    : null;

/**
 * Whether an idea can be deleted, and if not, what is holding it.
 *
 * Deleting an idea that still has a moment on the calendar would leave that
 * moment behind with nothing to say where it came from: the orphan card this
 * issue was about. So it is refused, and the refusal says what to do rather
 * than only that it cannot, with the calendar named first because it is the
 * one a planner can see.
 */
export const deleteIdeaRefusal = (linked: {
  schedule: number;
  tasks: number;
  resources: number;
  costs: number;
  cues: number;
}): string | null => {
  if (linked.schedule > 0) {
    return linked.schedule === 1
      ? "It is on the calendar. Unschedule it first and it returns to the bank, then it can be deleted."
      : `It is on the calendar ${linked.schedule} times. Unschedule each first, then it can be deleted.`;
  }
  if (linked.cues > 0) {
    return "It is happening inside a moment. Take it out of that moment first, then it can be deleted.";
  }
  if (linked.tasks + linked.resources + linked.costs > 0) {
    return "It has actions, requirements or costs attached. Remove those first, then it can be deleted.";
  }
  return null;
};

/**
 * What is on the clock on one day.
 *
 * The weekend grid and the phone's single day both draw from this, so they
 * cannot disagree about what a day holds. The grid passes its own idea of the
 * day, because a block mid drag is shown in the lane it is being dragged over.
 */
export const timedOn = <T extends { day: string; minutes: number | null }>(
  moments: readonly T[],
  day: string,
  dayOf: (moment: T) => string = (moment) => moment.day,
): T[] => moments.filter((moment) => moment.minutes !== null && dayOf(moment) === day);
