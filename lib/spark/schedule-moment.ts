import { DAY_ORDER } from "@lib/spark/days";

/**
 * One way to make a scheduled moment.
 *
 * Three doors lead here: adding something we already know is happening,
 * putting an idea on the schedule, and dropping an idea onto an hour. They
 * prefill different things and they ask different questions, but they all
 * end up shaping the same row, so a moment created one way is
 * indistinguishable from a moment created another.
 *
 * A duration is easier to say out loud than an end time, so the end is
 * computed here and stored as the label the calendar already reads. A moment
 * may legitimately have no clock time at all: the sheet says "Friday
 * afternoon, free time" and means it, and nothing in here will invent an hour
 * for it.
 */

export const TIME_LABEL = /^\d{1,2}(:\d{2})?\s*(am|pm)$/i;

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];
const DAYPARTS = ["morning", "afternoon", "evening", "anytime"];

/** A start label plus a length, as the end label the calendar reads. */
export const endLabel = (starts: string, minutes: number): string | null => {
  const match = starts.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match || !Number.isFinite(minutes) || minutes <= 0) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  const total = hour * 60 + Number(match[2] ?? 0) + Math.round(minutes);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

export type MomentInput = {
  title: string;
  day: string;
  /** A clock time, or blank when the moment only knows its part of the day. */
  starts?: string;
  /** Minutes. Only meaningful alongside a start. */
  minutes?: string;
  /** An explicit end wins over a duration, for the drawer that still edits one. */
  ends?: string;
  daypart?: string;
  track?: string;
  location?: string;
  /** The idea this came from, when it came from one. */
  sparkId?: string | null;
};

export type MomentRow = {
  day_key: string;
  starts_label: string | null;
  ends_label: string | null;
  daypart: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  spark_id: string | null;
  position: number;
};

export type Shaped = { ok: true; row: MomentRow } | { ok: false; message: string };

/**
 * Everything the three doors agree on. A title, a day, and either a time or
 * an honest part of the day. Track is a convenience with a sensible answer,
 * never a question a planner has to have an opinion about, and a moment
 * somebody deliberately added is confirmed: they said it is happening.
 */
export const shapeMoment = (input: MomentInput): Shaped => {
  const title = input.title.trim().slice(0, 160);
  if (!title) return { ok: false, message: "What is happening?" };
  if (!(DAY_ORDER as readonly string[]).includes(input.day)) {
    return { ok: false, message: "Which day?" };
  }

  const starts = (input.starts ?? "").trim().toLowerCase();
  if (starts && !TIME_LABEL.test(starts)) {
    return { ok: false, message: "A time like 10:45 am, or leave it open." };
  }

  const daypart = (input.daypart ?? "").trim();
  if (!starts && !DAYPARTS.includes(daypart)) {
    return { ok: false, message: "A time, or a part of the day." };
  }

  let ends: string | null = null;
  if (starts) {
    const explicit = (input.ends ?? "").trim().toLowerCase();
    if (explicit && !TIME_LABEL.test(explicit)) {
      return { ok: false, message: "An end like 11:15 am, or a duration." };
    }
    ends = explicit || endLabel(starts, Number((input.minutes ?? "").trim()));
  }

  const track = input.track && TRACKS.includes(input.track) ? input.track : "Program";

  return {
    ok: true,
    row: {
      day_key: input.day,
      starts_label: starts || null,
      ends_label: ends,
      daypart: starts ? null : daypart,
      title,
      track,
      location: (input.location ?? "").trim().slice(0, 120) || null,
      /* A moment somebody deliberately added is happening, so a guest sees
         it. Anything still being worked out is set back to a draft from the
         moment itself, where that is a real decision rather than a field on
         a creation form. */
      status: "confirmed",
      spark_id: input.sparkId ?? null,
      position: 99,
    },
  };
};
