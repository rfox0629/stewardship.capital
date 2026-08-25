/**
 * The weekend's days, in one place.
 *
 * Wednesday exists for the team: arrival, set up, unload. Its items stay
 * draft, and drafts never reach a guest's session, so the guest weekend
 * remains Thursday through Sunday without any screen having to know why.
 */

export const DAY_ORDER = ["wed", "thu", "fri", "sat", "sun"] as const;

export type DayKey = (typeof DAY_ORDER)[number];

export const DAY_NAMES: Record<string, string> = {
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Offset from the engagement's start date, which is Thursday. */
const DAY_OFFSET: Record<string, number> = {
  wed: -1,
  thu: 0,
  fri: 1,
  sat: 2,
  sun: 3,
};

export const dayDate = (
  startsOn: string | null,
  key: string,
): Date | null => {
  if (!startsOn || !(key in DAY_OFFSET)) return null;
  const date = new Date(`${startsOn}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + DAY_OFFSET[key]);
  return date;
};

export const dayDateLabel = (startsOn: string | null, key: string): string | null => {
  const date = dayDate(startsOn, key);
  return date
    ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
    : null;
};

/** Which day key is "today", when today falls inside the weekend. */
export const todayKey = (startsOn: string | null, now = new Date()): DayKey | null => {
  if (!startsOn) return null;
  for (const key of DAY_ORDER) {
    const date = dayDate(startsOn, key);
    if (
      date &&
      date.getUTCFullYear() === now.getFullYear() &&
      date.getUTCMonth() === now.getMonth() &&
      date.getUTCDate() === now.getDate()
    ) {
      return key;
    }
  }
  return null;
};

/**
 * "3:00 pm" as minutes since midnight, for ordering and for Now and Next.
 * A label that does not parse sorts last rather than wrongly.
 */
export const parseTimeLabel = (label: string | null | undefined): number | null => {
  if (!label) return null;
  const match = label.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3] === "pm") hours += 12;
  return hours * 60 + Number(match[2] ?? 0);
};
