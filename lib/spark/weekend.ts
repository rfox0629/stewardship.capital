/**
 * The two rules the Weekend canvas kept getting wrong.
 *
 * Both are decisions about what to draw, both are pure, and both broke in
 * ways that looked like data loss when they were tangled up in the view. They
 * live here so a test can hold them still.
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
};

/**
 * Which placeholders are still worth drawing.
 *
 * A placeholder stands in for one row until that row arrives, and it is
 * retired by identity. The obvious alternative, retiring it when something
 * exists at the hour it was dropped on, is wrong the moment the planner drags
 * that new block somewhere else: nothing is at the old hour any more, the
 * placeholder decides it is needed again, and the screen shows two blocks for
 * one row. That reads exactly like an accidental copy, and it is why this is
 * a named function with a test rather than a filter inline in the render.
 *
 * While a placeholder has no id yet its request is still in flight, so a row
 * for the same idea at the same day and start also retires it. That covers a
 * revalidation arriving before the action returns.
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

  return placed.filter((entry) =>
    entry.id
      ? !byId.has(entry.id)
      : !byPlacement.has(`${entry.ideaId}|${entry.day}|${label(entry.minutes)}`),
  );
};

/**
 * Which ideas still have nowhere to be.
 *
 * The overlay answers one question: what have we not placed in the weekend
 * yet. An idea that has become a moment of its own, or that happens inside
 * somebody else's, has an answer either way and stops being offered as though
 * it needed one.
 *
 * Placement is the only test. An idea with an action, a cost or a requirement
 * is still unplaced, and hiding it because somebody attached a receipt to it
 * would quietly lose it.
 *
 * The idea itself is untouched either way. This is about the overlay, and a
 * second occurrence is still available deliberately, from the idea.
 */
export const unscheduledIdeas = <T extends { scheduled: number }>(
  ideas: readonly T[],
): T[] => ideas.filter((idea) => idea.scheduled === 0);
