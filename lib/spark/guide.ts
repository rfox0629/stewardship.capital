import { parseTimeLabel } from "./days.ts";

/**
 * The weekend guide, as rules a test can hold still.
 *
 * One calendar, read two ways. A guest reads the public moments of Thursday
 * to Sunday with their menus and what they open. The team reads every moment,
 * including the setup and cleanup around the guests, with who runs it and
 * what comes next. Both readings are built from the same rows, so a time
 * changed in the calendar is changed in both without anyone editing twice.
 *
 * Everything here is pure. The pages fetch; this decides order, labels, who a
 * duty belongs to, and which moments collide.
 */

export type GuideKind =
  | "meal"
  | "free"
  | "coffee"
  | "game"
  | "program"
  | "worship"
  | "social"
  | "break"
  | "arrival";

export type Opens = "activities" | "coffee";

/** What a guest may read about a moment. Public by definition. */
export type GuestCopy = {
  kind?: GuideKind;
  /** A guest facing name, when the calendar's own is written for the team. */
  title?: string;
  summary?: string;
  menu?: string[];
  opens?: Opens[];
  optional?: boolean;
  /** Something still undecided, said plainly rather than hidden. */
  tbc?: string;
};

/** How the team runs a moment. Never part of a guest reading. */
export type OpsDetail = {
  purpose?: string;
  owner?: string;
  emcee?: string;
  support?: string;
  location?: string;
  materials?: string;
  next?: string;
  notes?: string;
  status?: string;
};

export type GuideMoment = {
  id: string;
  day: string;
  starts: string | null;
  ends: string | null;
  title: string;
  location: string | null;
  /** A broad span other moments happen during, like free time. */
  window: boolean;
  guide: GuestCopy | null;
  /** Team readings only. */
  teamOnly?: boolean;
  ops?: OpsDetail | null;
};

export type Activity = { name: string; category: string; note?: string };

export type Drink = {
  name: string;
  art: "shine" | "honeycomb" | "northwoods" | string;
  ingredients: string[];
  feel: string;
};

export type Guide = {
  name: string;
  organization: string;
  startsOn: string | null;
  endsOn: string | null;
  location: string | null;
  venue: string | null;
  published: boolean;
  moments: GuideMoment[];
  activities: Activity[];
  coffee: Drink[];
};

export const GUEST_DAYS = ["thu", "fri", "sat", "sun"] as const;
export const TEAM_DAYS = ["wed", "thu", "fri", "sat", "sun"] as const;

export const DAY_LONG: Record<string, string> = {
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_SHORT: Record<string, string> = {
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** "7:30 am" as the guide prints it: "7:30 AM". */
export const clock = (label: string | null | undefined): string => {
  const minutes = parseTimeLabel(label);
  if (minutes === null) return "";
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
};

/** The name a guest sees, which is not always the one the team works to. */
export const guestTitle = (moment: Pick<GuideMoment, "title" | "guide">): string =>
  moment.guide?.title?.trim() || moment.title;

/**
 * One day, in the order it happens.
 *
 * A window sorts by its start like anything else, so free time appears where
 * it begins and the bingo inside it follows. Something without a clock time
 * goes last rather than pretending to be at midnight.
 */
export const dayAgenda = <T extends Pick<GuideMoment, "day" | "starts" | "window" | "title">>(
  moments: readonly T[],
  day: string,
): T[] =>
  moments
    .filter((moment) => moment.day === day)
    .toSorted((a, b) => {
      const ma = parseTimeLabel(a.starts) ?? 24 * 60;
      const mb = parseTimeLabel(b.starts) ?? 24 * 60;
      if (ma !== mb) return ma - mb;
      /* At the same minute a window reads first: it is the frame. */
      if (a.window !== b.window) return a.window ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

/** Whether tapping a moment has anything more to show. */
export const hasDetail = (moment: GuideMoment): boolean => {
  const copy = moment.guide;
  if (!copy) return false;
  return Boolean(
    (copy.menu && copy.menu.length > 0) ||
      (copy.opens && copy.opens.length > 0) ||
      copy.summary ||
      copy.tbc ||
      copy.optional,
  );
};

/** What a tap offers, spelled for the row: "Menu", "Activities", "Coffee menu". */
export const detailCue = (moment: GuideMoment): string | null => {
  const copy = moment.guide;
  if (!copy) return null;
  if (copy.menu && copy.menu.length > 0) return "Menu";
  if (copy.opens?.includes("coffee")) return "Coffee menu";
  if (copy.opens?.includes("activities")) return "Activities";
  return hasDetail(moment) ? "Details" : null;
};

/* --------------------------------------------------------------- duties */

export type Duty = {
  id: string;
  title: string;
  owner: string | null;
  /** before, wed, thu, fri, sat, sun, or tbd */
  phase: string;
  when: string | null;
  notes: string | null;
  status: string;
  momentId: string | null;
  order: number;
};

/** Something still undecided that the team should be able to see. */
export type OpenDecision = {
  id: string;
  question: string;
  context: string | null;
  owner: string | null;
  /** A question carried on an idea rather than in the decisions list. */
  fromIdea: boolean;
};

export const PHASES = ["before", "wed", "thu", "fri", "sat", "sun", "tbd"] as const;

export const PHASE_LABEL: Record<string, string> = {
  before: "Before the event",
  wed: "Wednesday, September 30",
  thu: "Thursday, October 1",
  fri: "Friday, October 2",
  sat: "Saturday, October 3",
  sun: "Sunday, October 4",
  tbd: "Day to confirm",
};

export const UNASSIGNED = "To assign";

/**
 * The people behind "Alice, Keta, Emma & Scott".
 *
 * The tracker writes teams the way people talk, with commas, ampersands and
 * "and". Filtering by a person has to find them in all three. An empty or
 * unassigned owner is its own bucket, because an unassigned duty is exactly
 * the one somebody needs to see.
 */
export const peopleOf = (owner: string | null | undefined): string[] => {
  const text = (owner ?? "").trim();
  if (!text || /^to assign$/i.test(text) || /^tbd$/i.test(text)) return [UNASSIGNED];
  return text
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
};

/** Everyone named anywhere, alphabetical, with the unassigned bucket last. */
export const everyoneIn = (duties: readonly Pick<Duty, "owner">[]): string[] => {
  const names = new Set<string>();
  for (const duty of duties) for (const name of peopleOf(duty.owner)) names.add(name);
  const named = [...names].filter((name) => name !== UNASSIGNED).toSorted((a, b) => a.localeCompare(b));
  return names.has(UNASSIGNED) ? [...named, UNASSIGNED] : named;
};

/** Filtering only. Choosing a name proves nothing about who is holding the phone. */
export const dutiesFor = <T extends Pick<Duty, "owner">>(duties: readonly T[], person: string | null): T[] =>
  person ? duties.filter((duty) => peopleOf(duty.owner).includes(person)) : [...duties];

/** Duties by phase in the order the weekend happens, each phase in tracker order. */
export const byPhase = <T extends Pick<Duty, "phase" | "order">>(duties: readonly T[]) =>
  PHASES.map((phase) => ({
    phase,
    duties: duties.filter((duty) => duty.phase === phase).toSorted((a, b) => a.order - b.order),
  })).filter((group) => group.duties.length > 0);

/* ------------------------------------------------------------ conflicts */

/**
 * Moments that overlap each other on the same day.
 *
 * Windows are left out: free time is meant to have things inside it. A moment
 * with no end is a point in time; it collides only if it starts inside
 * something that does have an end. This is what flags a move that lands a
 * moment on top of another, so it is shown to the team rather than silently
 * accepted.
 */
export const timingConflicts = (
  moments: readonly Pick<GuideMoment, "id" | "day" | "starts" | "ends" | "window">[],
): Map<string, string[]> => {
  const found = new Map<string, string[]>();
  const note = (a: string, b: string) => {
    found.set(a, [...(found.get(a) ?? []), b]);
    found.set(b, [...(found.get(b) ?? []), a]);
  };

  const timed = moments
    .filter((moment) => !moment.window)
    .map((moment) => {
      const start = parseTimeLabel(moment.starts);
      const end = parseTimeLabel(moment.ends);
      return { id: moment.id, day: moment.day, start, end: end !== null && start !== null && end > start ? end : null };
    })
    .filter((moment): moment is { id: string; day: string; start: number; end: number | null } =>
      moment.start !== null);

  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const a = timed[i];
      const b = timed[j];
      if (a.day !== b.day) continue;
      const inside = (x: typeof a, y: typeof a) =>
        x.end !== null && y.start >= x.start && y.start < x.end;
      const sameStart = a.start === b.start;
      if (sameStart || inside(a, b) || inside(b, a)) note(a.id, b.id);
    }
  }
  return found;
};

/** Activities grouped by category, in the order categories first appear. */
export const activityGroups = (activities: readonly Activity[]) => {
  const order: string[] = [];
  const groups = new Map<string, Activity[]>();
  for (const activity of activities) {
    if (!groups.has(activity.category)) {
      groups.set(activity.category, []);
      order.push(activity.category);
    }
    groups.get(activity.category)!.push(activity);
  }
  return order.map((category) => ({ category, activities: groups.get(category)! }));
};

/* ------------------------------------------------------------- parsing */

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text).filter((item): item is string => Boolean(item)) : [];

/** A guest copy object from the database, trusting nothing about its shape. */
export const readGuestCopy = (raw: unknown): GuestCopy | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const opens = list(source.opens).filter((item): item is Opens => item === "activities" || item === "coffee");
  const menu = list(source.menu);
  return {
    kind: text(source.kind) as GuideKind | undefined,
    title: text(source.title),
    summary: text(source.summary),
    menu: menu.length > 0 ? menu : undefined,
    opens: opens.length > 0 ? opens : undefined,
    optional: source.optional === true,
    tbc: text(source.tbc),
  };
};

export const readOps = (raw: unknown): OpsDetail | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const detail: OpsDetail = {
    purpose: text(source.purpose),
    owner: text(source.owner),
    emcee: text(source.emcee),
    support: text(source.support),
    location: text(source.location),
    materials: text(source.materials),
    next: text(source.next),
    notes: text(source.notes),
    status: text(source.status),
  };
  return Object.values(detail).some(Boolean) ? detail : null;
};

export const readActivities = (raw: unknown): Activity[] =>
  (Array.isArray(raw) ? raw : []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const name = text(source.name);
    const category = text(source.category);
    return name && category ? [{ name, category, note: text(source.note) }] : [];
  });

export const readDrinks = (raw: unknown): Drink[] =>
  (Array.isArray(raw) ? raw : []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const name = text(source.name);
    if (!name) return [];
    return [{ name, art: text(source.art) ?? "", ingredients: list(source.ingredients), feel: text(source.feel) ?? "" }];
  });
