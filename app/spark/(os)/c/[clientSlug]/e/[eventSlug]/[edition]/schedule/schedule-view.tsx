"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { scheduleIdea } from "../plan/actions";

import {
  addCue,
  addMomentResource,
  addMomentTask,
  createMoment,
  deleteCue,
  deleteMoment,
  rescheduleMoment,
  updateCue,
  updateMoment,
} from "./actions";

/**
 * The canvas.
 *
 * The weekend as a working calendar: time down, days across, moments as
 * compact blocks a planner can pick up and move.
 *
 * Dragging a block vertically changes its time; across, its day; the handle
 * at its foot, its length. Above each day sits that day's loose ideas, and
 * dropping one onto an hour is what turns a guess into a moment: the idea
 * stays where it is and gains a scheduled moment pointing back at it.
 *
 * Every commit is one deliberate release, applied optimistically and
 * reverted with a message if the database refuses. A drag is never the only
 * way: a block opens a drawer with the same fields as plain inputs, and an
 * idea opens with its scheduling sheet already asking.
 */

export type Moment = {
  id: string;
  day: string;
  starts: string | null;
  ends: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
  /** A moment the sheet gives without a clock time carries a part of day. */
  daypart: string | null;
  sparkId: string | null;
  sparkTitle: string | null;
  minutes: number | null;
  endMinutes: number | null;
};

export type DayLane = { key: string; name: string; date: string | null };

/** A run of show cue, stored relative to its moment's start. The absolute
 *  time is always computed, never stored, so a moved moment needs nothing. */
export type Cue = {
  id: string;
  momentId: string;
  offset: number;
  cue: string;
  who: string | null;
  note: string | null;
  /** Some cues are ideas placed inside this moment rather than plain beats. */
  ideaId: string | null;
};

export type RelatedRecord = {
  id: string;
  momentId: string;
  kind: "task" | "resource";
  label: string;
  sub: string;
};

const fmtOffset = (offset: number) =>
  offset === 0 ? "start" : offset > 0 ? `+${offset} min` : `${offset} min`;

export type TentativeIdea = {
  id: string;
  title: string;
  status: string;
  day: string;
  daypart: string;
  /** How many moments this idea has already become. One idea may become
   *  several: coffee on Friday morning is coffee again on Saturday. */
  scheduled: number;
};

type Role = "planner" | "client" | "stakeholder";
type Route = { clientSlug: string; eventSlug: string; edition: string };

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];
const TRACK_CLASS: Record<string, string> = {
  Program: "ev-b-program",
  Meals: "ev-b-meals",
  Experience: "ev-b-experience",
  Hospitality: "ev-b-hospitality",
  Logistics: "ev-b-logistics",
  Worship: "ev-b-worship",
};
const OPEN_SPACE = /^(free|open)\b|^rest\b|family time/i;

/* An itinerary, not an office calendar. An hour is 75px rather than 132, so
   the shape of a day (a dense morning, a protected afternoon) is legible in
   one look. Low enough for that, high enough that this weekend's shortest
   real moment, a ten minute devotional, still holds a line of type. */
const PX_PER_MIN = 1.25;
const SNAP = 15;
const DEFAULT_LEN = 60;
const MIN_BLOCK_PX = 14;
/* Below this a block is one line: time and title, nothing else. */
const TIGHT_PX = 40;
const DURATIONS = [15, 30, 45, 60, 90, 120];
/* How many of a day's ideas the strip shows before it offers the rest. */
const TRAY_CHIPS = 3;
const TRAY_CHIPS_DAY = 4;

const fmt = (minutes: number) => {
  const clamped = Math.max(0, Math.min(24 * 60 - 5, minutes));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const hourLabel = (minutes: number) => {
  const h24 = Math.floor(minutes / 60);
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12} ${period}`;
};

const snap = (minutes: number) => Math.round(minutes / SNAP) * SNAP;

/* The server cannot know the viewport or the query string, so the first
   client render must match the server's and the preference applies after
   hydration. useSyncExternalStore gives that flag without an effect. */
const noopSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(noopSubscribe, () => true, () => false);

type Override = { day?: string; minutes?: number; endMinutes?: number | null };

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  fromDay: string;
  fromMinutes: number;
  fromEnd: number | null;
  moved: boolean;
  previewDay: string;
  previewMinutes: number;
  previewEnd: number | null;
};

/* ------------------------------------------------------------- drawer */

type DrawerTab = "details" | "ros" | "actions";

function MomentDrawer({
  moment,
  role,
  route,
  days,
  cues,
  related,
  onClose,
}: {
  moment: Moment;
  role: Role;
  route: Route;
  days: DayLane[];
  cues: Cue[];
  related: RelatedRecord[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  /* The drawer only mounts after hydration, so the deep link is safe here. */
  const [tab, setTab] = useState<DrawerTab>(() => {
    if (typeof window === "undefined") return "details";
    const wanted = new URLSearchParams(window.location.search).get("tab");
    return wanted === "ros" || wanted === "actions" ? wanted : "details";
  });
  const planner = role === "planner";

  /* Not tabs. A moment opens, and its run of show and its actions expand
     underneath it, because they are parts of the moment rather than other
     places to be. */
  const [expanded, setExpanded] = useState<"ros" | "actions" | null>(
    tab === "ros" ? "ros" : tab === "actions" ? "actions" : null,
  );

  return (
    <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label={moment.title}>
      <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={onClose} />
      <div className="ev-drawer">
        <div className="ev-drawer-head">
          <p className="ev-drawer-kicker">
            {moment.track}
            {moment.status === "draft" && role !== "stakeholder" ? " · taking shape" : ""}
          </p>
          <button type="button" className="ev-drawer-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {planner ? (
          <form
            className="ev-drawer-body"
            action={(formData) =>
              startTransition(async () => {
                const outcome = await updateMoment(
                  route.clientSlug, route.eventSlug, route.edition, moment.id, formData,
                );
                if (outcome.ok) onClose();
                else setMessage(outcome.message ?? "That did not save.");
              })
            }
          >
            <div className="ev-field">
              <label>Title</label>
              <input name="title" defaultValue={moment.title} required maxLength={160} />
            </div>
            <div className="ev-form-grid">
              <div className="ev-field">
                <label>Day</label>
                <select name="day" defaultValue={moment.day}>
                  {days.map((day) => (
                    <option key={day.key} value={day.key}>{day.name}</option>
                  ))}
                </select>
              </div>
              <div className="ev-field">
                <label>Starts</label>
                <input name="starts" defaultValue={moment.starts ?? ""} placeholder="3:00 pm" />
              </div>
              <div className="ev-field">
                <label>Ends</label>
                <input name="ends" defaultValue={moment.ends ?? ""} placeholder="4:00 pm" />
              </div>
            </div>
            <div className="ev-form-grid">
              <div className="ev-field">
                <label>Track</label>
                <select name="track" defaultValue={moment.track}>
                  {TRACKS.map((track) => <option key={track}>{track}</option>)}
                </select>
              </div>
              <div className="ev-field">
                <label>Status</label>
                <select name="status" defaultValue={moment.status}>
                  <option value="draft">Taking shape</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>
            <div className="ev-field">
              <label>Location</label>
              <input name="location" defaultValue={moment.location ?? ""} maxLength={120} />
            </div>
            <div className="ev-field">
              <label>Planner note</label>
              <input name="note" defaultValue={moment.note ?? ""} maxLength={400} />
            </div>
            {moment.sparkTitle ? (
              <p className="ev-drawer-spark">
                <b>Idea</b> {moment.sparkTitle}
              </p>
            ) : null}
            <div className="ev-row-actions">
              <button type="submit" disabled={pending}>{pending ? "Saving" : "Save"}</button>
              <button
                type="button"
                className="ev-quiet"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteMoment(route.clientSlug, route.eventSlug, route.edition, moment.id);
                    onClose();
                  })
                }
              >
                Remove
              </button>
            </div>
            {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
          </form>
        ) : null}

        {planner ? (
          <div className="ev-expanders">
            <button
              type="button"
              className="ev-expander"
              aria-expanded={expanded === "ros"}
              onClick={() => setExpanded(expanded === "ros" ? null : "ros")}
            >
              <b>Run of show</b>
              <span>{cues.length > 0 ? `${cues.length} cues` : "Add the first cue"}</span>
              <i aria-hidden="true">{expanded === "ros" ? "−" : "+"}</i>
            </button>
            {expanded === "ros" ? (
              <RosEditor moment={moment} cues={cues} route={route} />
            ) : null}

            <button
              type="button"
              className="ev-expander"
              aria-expanded={expanded === "actions"}
              onClick={() => setExpanded(expanded === "actions" ? null : "actions")}
            >
              <b>Actions and needs</b>
              <span>{related.length > 0 ? `${related.length} attached` : "Nothing yet"}</span>
              <i aria-hidden="true">{expanded === "actions" ? "−" : "+"}</i>
            </button>
            {expanded === "actions" ? (
              <MomentRecords moment={moment} rows={related} route={route} />
            ) : null}
          </div>
        ) : null}

        {!planner ? (
          <div className="ev-drawer-body">
            <h3 className="ev-drawer-title">{moment.title}</h3>
            <p className="ev-drawer-line">
              {days.find((day) => day.key === moment.day)?.name}
              {moment.starts ? `, ${moment.starts}` : moment.daypart ? `, ${moment.daypart}` : ""}
              {moment.ends ? ` to ${moment.ends}` : ""}
            </p>
            {moment.location ? <p className="ev-drawer-line">{moment.location}</p> : null}
            {role === "client" && moment.note ? (
              <p className="ev-drawer-note">{moment.note}</p>
            ) : null}
            {role === "client" && moment.sparkTitle ? (
              <p className="ev-drawer-spark"><b>Idea</b> {moment.sparkTitle}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------- the run of show, editable */

function RosEditor({
  moment,
  cues,
  route,
}: {
  moment: Moment;
  cues: Cue[];
  route: Route;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = moment.minutes;
  const length =
    start !== null && moment.endMinutes !== null ? moment.endMinutes - start : null;
  const ordered = [...cues].sort((a, b) => a.offset - b.offset);
  const base = `/spark/c/${route.clientSlug}/e/${route.eventSlug}/${route.edition}`;

  const cueForm = (cue: Cue | null) => (
    <form
      className="ev-cue-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = cue
            ? await updateCue(route.clientSlug, route.eventSlug, route.edition, cue.id, formData)
            : await addCue(route.clientSlug, route.eventSlug, route.edition, moment.id, formData);
          if (outcome.ok) {
            setEditing(null);
            setMessage(null);
          } else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      <div className="ev-cue-form-grid">
        <label>
          Min
          <input
            name="offset"
            type="number"
            step={1}
            defaultValue={cue?.offset ?? 0}
            required
          />
        </label>
        <label>
          Cue
          <input name="cue" defaultValue={cue?.cue ?? ""} maxLength={300} required />
        </label>
        <label>
          Who
          <input name="who" defaultValue={cue?.who ?? ""} maxLength={80} />
        </label>
      </div>
      <label className="ev-cue-note">
        Note
        <input name="note" defaultValue={cue?.note ?? ""} maxLength={300} />
      </label>
      <div className="ev-row-actions">
        <button type="submit" disabled={pending}>{cue ? "Save" : "Add cue"}</button>
        {cue ? (
          <>
            <button
              type="button"
              className="ev-quiet"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteCue(route.clientSlug, route.eventSlug, route.edition, cue.id);
                  setEditing(null);
                })
              }
            >
              Delete
            </button>
            <button type="button" className="ev-quiet" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="ev-drawer-body">
      <p className="ev-drawer-line">
        {moment.title}{moment.starts ? ` · ${moment.starts}` : ""}
        {moment.ends ? ` to ${moment.ends}` : ""}
      </p>
      <p className="ev-ros-hint">
        Minutes are relative to the start. Move the moment and every cue moves
        with it.
      </p>
      {ordered.map((cue) =>
        editing === cue.id ? (
          <div key={cue.id}>{cueForm(cue)}</div>
        ) : (
          <button
            key={cue.id}
            type="button"
            className="ev-cue-row"
            onClick={() => setEditing(cue.id)}
          >
            <span className="ev-cue-when">
              {fmtOffset(cue.offset)}
              {start !== null ? <i>{fmt(start + cue.offset)}</i> : null}
            </span>
            <span className="ev-cue-text">
              {cue.cue}
              {cue.ideaId ? <small className="ev-cue-idea">From an idea</small> : null}
              {cue.note ? <small>{cue.note}</small> : null}
              {length !== null && cue.offset > length ? (
                <small className="ev-cue-warn">past the end of this moment</small>
              ) : null}
            </span>
            <span className="ev-cue-who">{cue.who ?? ""}</span>
          </button>
        ),
      )}
      {ordered.some((cue) => cue.ideaId) ? (
        <div className="ev-cue-ideas">
          {ordered.filter((cue) => cue.ideaId).map((cue) => (
            <Link key={`idea-${cue.id}`} className="ws-link" href={`${base}/plan?open=${cue.ideaId}`}>
              <b>Idea</b> {cue.cue}
            </Link>
          ))}
        </div>
      ) : null}
      {editing === null || editing === "new" ? cueForm(null) : null}
      {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
    </div>
  );
}

/* ------------------------------------- what this moment needs, recorded */

function MomentRecords({
  moment,
  rows,
  route,
}: {
  moment: Moment;
  rows: RelatedRecord[];
  route: Route;
}) {
  const [kind, setKind] = useState<"task" | "resource">("task");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const actions = rows.filter((row) => row.kind === "task");
  const needs = rows.filter((row) => row.kind === "resource");

  const list = (label: string, items: RelatedRecord[]) =>
    items.length > 0 ? (
      <div className="ev-drawer-section">
        <p className="ev-drawer-sub">{label}</p>
        {items.map((row) => (
          <p key={`${row.kind}-${row.id}`} className="ev-drawer-noteline">
            {row.label}
            <span>{row.sub}</span>
          </p>
        ))}
      </div>
    ) : null;

  return (
    <div className="ev-drawer-body">
      {rows.length === 0 ? (
        <p className="ev-row-detail">Nothing needed for this moment yet.</p>
      ) : null}
      {list("Actions", actions)}
      {list("Needs", needs)}

      <form
        className="ev-cue-form"
        action={(formData) =>
          startTransition(async () => {
            const outcome =
              kind === "task"
                ? await addMomentTask(route.clientSlug, route.eventSlug, route.edition, moment.id, formData)
                : await addMomentResource(route.clientSlug, route.eventSlug, route.edition, moment.id, formData);
            if (!outcome.ok) setMessage(outcome.message ?? "That did not save.");
            else setMessage(null);
          })
        }
      >
        <div className="ev-seg-small" role="group" aria-label="What to add">
          <button
            type="button"
            aria-pressed={kind === "task"}
            onClick={() => setKind("task")}
          >
            Action
          </button>
          <button
            type="button"
            aria-pressed={kind === "resource"}
            onClick={() => setKind("resource")}
          >
            Need
          </button>
        </div>

        {kind === "task" ? (
          <div className="ev-cue-form-grid">
            <label>
              Action
              <input name="title" maxLength={160} required />
            </label>
            <label>
              Owner
              <input name="owner" maxLength={80} />
            </label>
            <label>
              Due
              <input name="due" type="date" />
            </label>
          </div>
        ) : (
          <div className="ev-cue-form-grid">
            <label>
              Needed
              <input name="name" maxLength={160} required />
            </label>
            <label>
              Kind
              <select name="kind" defaultValue="supply">
                <option value="person">Person</option>
                <option value="vendor">Vendor</option>
                <option value="equipment">Equipment</option>
                <option value="supply">Supply</option>
                <option value="deliverable">Deliverable</option>
              </select>
            </label>
            <label>
              Cost
              <input name="cost" inputMode="decimal" placeholder="0" />
            </label>
          </div>
        )}
        <div className="ev-row-actions">
          <button type="submit" disabled={pending}>
            {kind === "task" ? "Add action" : "Add need"}
          </button>
        </div>
      </form>
      {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------- the calendar */

export function ScheduleView({
  moments,
  days,
  role,
  route,
  today,
  base,
  cues = [],
  related = [],
  tentative = [],
}: {
  moments: Moment[];
  days: DayLane[];
  role: Role;
  route: Route;
  today: string | null;
  base: string;
  cues?: Cue[];
  related?: RelatedRecord[];
  tentative?: TentativeIdea[];
}) {
  const planner = role === "planner";
  const hydrated = useHydrated();
  /* ?view= and ?day= deep link a specific view, for shared links and for
     returning to the same place; otherwise a phone starts on the day. */
  const [view, setView] = useState<"weekend" | "day">(() => {
    if (typeof window === "undefined") return "weekend";
    const wanted = new URLSearchParams(window.location.search).get("view");
    if (wanted === "day" || wanted === "weekend") return wanted;
    return window.matchMedia("(max-width: 760px)").matches ? "day" : "weekend";
  });
  /* Not every day of the weekend has a schedule. Opening on an empty one
     looks like a broken screen, so the day view starts on today when the
     weekend is running, and otherwise on the first day that has anything. */
  const firstBusyDay =
    days.find((day) => moments.some((moment) => moment.day === day.key))?.key ?? "thu";
  const [dayKey, setDayKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const wanted = new URLSearchParams(window.location.search).get("day");
      if (wanted) return wanted;
    }
    return today ?? firstBusyDay;
  });
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("open")
      : null,
  );
  const [addDay, setAddDay] = useState<string | null>(null);
  /* The day's loose ideas are the point of the tray, so they are there by
     default and can be put away. */
  const [showSparks, setShowSparks] = useState<boolean>(() =>
    typeof window === "undefined" ||
    new URLSearchParams(window.location.search).get("sparks") !== "0",
  );
  /* Two lenses over the same schedule: the calendar, and its cues. */
  const [lens, setLens] = useState<"schedule" | "ros">(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("lens") === "ros"
      ? "ros"
      : "schedule",
  );
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /* An idea in the air, where it would land, and what is asking for its
     length. Separate from the block drag above: that moves something that
     already exists, this brings something into existence. */
  const [carrying, setCarrying] = useState<TentativeIdea | null>(null);
  const [landing, setLanding] = useState<{ day: string; minutes: number } | null>(null);
  const [asking, setAsking] = useState<{ idea: TentativeIdea; day: string; minutes: number } | null>(null);
  const [placed, setPlaced] = useState<
    Array<{ key: string; ideaId: string; title: string; day: string; minutes: number; length: number }>
  >([]);
  /* A busy day holds more ideas than a compact strip should show at once. */
  const [openTray, setOpenTray] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* Overrides sit on top of the server's truth, so a committed drag holds
     its place until the refreshed data arrives carrying the same answer. */
  const merged: Moment[] = useMemo(
    () =>
      moments.map((moment) => {
        const over = overrides.get(moment.id);
        if (!over) return moment;
        const minutes = over.minutes ?? moment.minutes;
        const endMinutes = over.endMinutes !== undefined ? over.endMinutes : moment.endMinutes;
        return {
          ...moment,
          day: over.day ?? moment.day,
          minutes,
          endMinutes,
          starts: minutes !== null && minutes !== undefined ? fmt(minutes) : moment.starts,
          ends: endMinutes !== null && endMinutes !== undefined ? fmt(endMinutes) : moment.ends,
        };
      }),
    [moments, overrides],
  );

  const laneDays = days;
  /* The grid covers the hours the weekend uses, with an hour of air either
     side, rather than a fixed dawn to midnight that is mostly empty. */
  const dayStart = useMemo(() => {
    const starts = merged
      .map((moment) => moment.minutes)
      .filter((value): value is number => value !== null);
    if (starts.length === 0) return 8 * 60;
    return Math.max(0, Math.floor((Math.min(...starts) - 60) / 60) * 60);
  }, [merged]);
  const dayEnd = useMemo(() => {
    const ends = merged
      .map((moment) => moment.endMinutes ?? moment.minutes)
      .filter((value): value is number => value !== null);
    if (ends.length === 0) return 22 * 60;
    return Math.min(24 * 60, Math.ceil((Math.max(...ends) + 45) / 60) * 60);
  }, [merged]);
  const gridHeight = (dayEnd - dayStart) * PX_PER_MIN;
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let minute = dayStart; minute <= dayEnd; minute += 60) list.push(minute);
    return list;
  }, [dayStart, dayEnd]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const markers = useMemo(() => {
    const result = new Map<string, "now" | "next">();
    if (!today) return result;
    const todays = merged
      .filter((moment) => moment.day === today && moment.minutes !== null)
      .sort((a, b) => (a.minutes as number) - (b.minutes as number));
    const current = [...todays].reverse().find((m) => (m.minutes as number) <= nowMin);
    const next = todays.find((m) => (m.minutes as number) > nowMin);
    if (current) result.set(current.id, "now");
    if (next) result.set(next.id, "next");
    return result;
  }, [merged, today, nowMin]);

  /* ------------------------------------------------------ drag commit */

  const commit = (state: DragState) => {
    const changed =
      state.previewDay !== state.fromDay ||
      state.previewMinutes !== state.fromMinutes ||
      state.previewEnd !== state.fromEnd;
    if (!changed) return;

    const id = state.id;
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, {
        day: state.previewDay,
        minutes: state.previewMinutes,
        endMinutes: state.previewEnd,
      });
      return next;
    });
    setFailure(null);

    startTransition(async () => {
      const outcome = await rescheduleMoment(
        route.clientSlug, route.eventSlug, route.edition, id,
        state.mode === "move"
          ? {
              day: state.previewDay,
              starts: fmt(state.previewMinutes),
              ends: state.previewEnd !== null ? fmt(state.previewEnd) : undefined,
            }
          : { ends: state.previewEnd !== null ? fmt(state.previewEnd) : null },
      );
      if (!outcome.ok) {
        setOverrides((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        setFailure("That change did not save, so the calendar was put back.");
      }
    });
  };

  const beginDrag = (
    event: React.PointerEvent,
    moment: Moment,
    mode: "move" | "resize",
  ) => {
    if (!planner || moment.minutes === null) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setDrag({
      id: moment.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      fromDay: moment.day,
      fromMinutes: moment.minutes,
      fromEnd: moment.endMinutes,
      moved: false,
      previewDay: moment.day,
      previewMinutes: moment.minutes,
      previewEnd: moment.endMinutes,
    });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag || !gridRef.current) return;
    const dy = event.clientY - drag.startY;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dy) < 4 && Math.abs(dx) < 4) return;

    const deltaMin = snap(dy / PX_PER_MIN);
    if (drag.mode === "move") {
      const rect = gridRef.current.getBoundingClientRect();
      const laneWidth = rect.width / laneDays.length;
      const laneIndex = Math.max(
        0,
        Math.min(laneDays.length - 1, Math.floor((event.clientX - rect.left) / laneWidth)),
      );
      const length =
        drag.fromEnd !== null ? drag.fromEnd - drag.fromMinutes : null;
      const minutes = Math.max(dayStart, Math.min(dayEnd - 15, drag.fromMinutes + deltaMin));
      setDrag({
        ...drag,
        moved: true,
        previewDay: laneDays[laneIndex].key,
        previewMinutes: minutes,
        previewEnd: length !== null ? minutes + length : null,
      });
    } else {
      const baseEnd = drag.fromEnd ?? drag.fromMinutes + DEFAULT_LEN;
      const end = Math.max(drag.fromMinutes + SNAP, Math.min(dayEnd, baseEnd + deltaMin));
      setDrag({ ...drag, moved: true, previewEnd: snap(end) });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.moved) commit(drag);
    const wasMoved = drag.moved;
    const id = drag.id;
    setDrag(null);
    if (!wasMoved) setOpenId(id);
  };

  /* -------------------------------------------------------- rendering */

  const block = (moment: Moment, inTimeline = false) => {
    const dragging = drag?.id === moment.id && drag.moved;
    const shown = dragging
      ? {
          ...moment,
          day: drag.previewDay,
          minutes: drag.previewMinutes,
          endMinutes: drag.previewEnd,
          starts: fmt(drag.previewMinutes),
          ends: drag.previewEnd !== null ? fmt(drag.previewEnd) : null,
        }
      : moment;
    const start = shown.minutes ?? dayStart;
    const length =
      (shown.endMinutes ?? impliedEnd.get(moment.id) ?? start + DEFAULT_LEN) - start;
    /* Short moments read on one line, which is most of this weekend. */
    const tight = length * PX_PER_MIN < TIGHT_PX;
    const marker = markers.get(moment.id);
    const open = OPEN_SPACE.test(moment.title);

    const classes = [
      "ev-block",
      TRACK_CLASS[moment.track] ?? "ev-b-logistics",
      moment.status === "draft" ? "ev-block-draft" : "",
      open ? "ev-block-open" : "",
      dragging ? "ev-block-dragging" : "",
      inTimeline ? "ev-block-row" : "",
      tight && !inTimeline ? "ev-block-tight" : "",
    ].join(" ");

    const style = inTimeline
      ? undefined
      : {
          top: (start - dayStart) * PX_PER_MIN,
          height: Math.max(MIN_BLOCK_PX, length * PX_PER_MIN - 1),
        };

    return (
      <div
        key={moment.id}
        className={classes}
        style={style}
        onPointerDown={(event) => {
          if (inTimeline || !planner) return;
          beginDrag(event, moment, "move");
        }}
        onClick={() => {
          if (inTimeline || !planner) setOpenId(moment.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") setOpenId(moment.id);
        }}
      >
        <span className="ev-block-time">
          {shown.starts ?? shown.daypart}
          {marker ? (
            <em className={marker === "now" ? "ev-now" : "ev-next"}>
              {marker === "now" ? "Now" : "Next"}
            </em>
          ) : null}
        </span>
        <span className="ev-block-title">{moment.title}</span>
        {!inTimeline && length * PX_PER_MIN >= 52 && moment.location ? (
          <span className="ev-block-where">{moment.location}</span>
        ) : null}
        {inTimeline && moment.location ? (
          <span className="ev-block-where">{moment.location}</span>
        ) : null}
        {planner && !inTimeline ? (
          <span
            className="ev-block-grip"
            onPointerDown={(event) => {
              event.stopPropagation();
              beginDrag(event, moment, "resize");
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    );
  };

  /* Until hydration, mirror exactly what the server rendered. */
  const shownView = hydrated ? view : "weekend";
  const shownSparks = hydrated ? showSparks : false;
  const shownLens = hydrated && planner ? lens : "schedule";
  /* A day's loose ideas. Placement is a guess about the day, so these are
     exactly the ideas somebody thinks belong here and has not yet put in an
     hour. Unplaced and event-wide ideas are not shown: they have no day to
     sit above, and they are one click away in the Plan. */
  const ideasFor = (dayKey: string) =>
    shownSparks && planner ? tentative.filter((idea) => idea.day === dayKey) : [];

  /* ------------------------------------------- an idea dropped onto an hour */

  /** Where a pointer sits on the grid, in a day and a snapped minute. */
  const landingAt = (event: React.DragEvent) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const laneWidth = rect.width / laneDays.length;
    const laneIndex = Math.max(
      0,
      Math.min(laneDays.length - 1, Math.floor((event.clientX - rect.left) / laneWidth)),
    );
    const minutes = Math.max(
      dayStart,
      Math.min(dayEnd - SNAP, snap(dayStart + (event.clientY - rect.top) / PX_PER_MIN)),
    );
    return { day: laneDays[laneIndex].key, minutes };
  };

  /* One scheduling engine. The drag arrives here with a day and an hour, and
     so does the sheet inside the idea; neither duplicates the idea, and an
     idea that already has a moment simply gains another. */
  const schedule = (idea: TentativeIdea, day: string, minutes: number, length: number) => {
    const key = `${idea.id}-${day}-${minutes}`;
    setPlaced((prev) => [...prev.filter((entry) => entry.key !== key),
      { key, ideaId: idea.id, title: idea.title, day, minutes, length }]);
    setAsking(null);
    setFailure(null);
    startTransition(async () => {
      const outcome = await scheduleIdea(
        route.clientSlug, route.eventSlug, route.edition, idea.id,
        { day, starts: fmt(minutes), minutes: String(length), track: "Experience" },
      );
      if (!outcome.ok) {
        setPlaced((prev) => prev.filter((entry) => entry.key !== key));
        setFailure(outcome.message ?? "That did not schedule, so nothing was added.");
      }
    });
  };

  /* A moment drawn the instant it is dropped stops being drawn the instant
     the real row arrives carrying the same answer. */
  const already = new Set(
    merged.filter((moment) => moment.sparkId).map((m) => `${m.sparkId}|${m.day}|${m.starts}`),
  );
  const landed = placed.filter(
    (entry) => !already.has(`${entry.ideaId}|${entry.day}|${fmt(entry.minutes)}`),
  );
  /* The sheet says "Afternoon: free time" and means it. Those moments carry
     a part of day rather than a start, so they sit in their own band. */
  const untimedFor = (key: string) =>
    merged.filter((moment) => moment.minutes === null && moment.day === key);

  /* The sheet gives starts and no ends: a moment runs until the next one
     begins. Without this every block would claim a default hour and bury
     the three that follow it. */
  const impliedEnd = new Map<string, number>();
  for (const day of laneDays) {
    const timed = merged
      .filter((moment) => moment.day === day.key && moment.minutes !== null)
      .toSorted((a, b) => (a.minutes as number) - (b.minutes as number));
    timed.forEach((moment, index) => {
      const start = moment.minutes as number;
      const next = timed[index + 1]?.minutes ?? null;
      const end =
        moment.endMinutes ??
        (next !== null ? Math.min(next, start + DEFAULT_LEN) : start + DEFAULT_LEN);
      impliedEnd.set(moment.id, Math.max(start + 10, end));
    });
  }
  const shownDayKey = hydrated ? dayKey : (today ?? firstBusyDay);
  const openMoment = hydrated
    ? (merged.find((moment) => moment.id === openId) ?? null)
    : null;
  const activeDay = laneDays.find((day) => day.key === shownDayKey) ?? laneDays[0];
  const timeline = merged
    .filter((moment) => moment.day === activeDay?.key)
    .sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999));

  return (
    <>
      <div className="ev-schedule-bar">
        <div className="ev-bar-left">
          {planner ? (
            <div className="ev-toggle" role="tablist" aria-label="Lens">
              <button type="button" role="tab" aria-selected={shownLens === "schedule"} onClick={() => setLens("schedule")}>
                Schedule
              </button>
              <button type="button" role="tab" aria-selected={shownLens === "ros"} onClick={() => setLens("ros")}>
                Run of show
              </button>
            </div>
          ) : null}
          {shownLens === "schedule" ? (
            <div className="ev-toggle" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={shownView === "weekend"} onClick={() => setView("weekend")}>
                Weekend
              </button>
              <button type="button" role="tab" aria-selected={shownView === "day"} onClick={() => setView("day")}>
                Day
              </button>
            </div>
          ) : null}
        </div>
        <div className="ev-bar-right">
          {failure ? <span className="ev-bar-failure" role="status">{failure}</span> : null}
          {shownLens === "schedule" && planner && tentative.length > 0 ? (
            <button
              type="button"
              className="ev-bar-quiet"
              aria-pressed={shownSparks}
              onClick={() => setShowSparks((current) => !current)}
            >
              {shownSparks ? "Hide ideas" : "Show ideas"}
            </button>
          ) : null}
          {planner ? (
            <button type="button" className="ev-bar-add" onClick={() => setAddDay(activeDay?.key ?? "thu")}>
              Add
            </button>
          ) : null}
          {role !== "stakeholder" ? (
            <Link className="ev-print-link" href={`${base}/schedule/print`}>
              Print
            </Link>
          ) : null}
        </div>
      </div>

      {shownLens === "ros" ? (
        <RosLens
          cues={cues}
          moments={merged}
          days={laneDays}
          today={today}
          nowMin={nowMin}
          onOpen={(id) => setOpenId(id)}
        />
      ) : shownView === "weekend" ? (
        <div className="ev-grid-wrap">
          <div className="ev-grid-head" style={{ marginLeft: 52 }}>
            {laneDays.map((day) => (
              <div key={day.key} className={`ev-grid-dayname ${day.key === today ? "ev-grid-today" : ""}`}>
                <b>{day.name}</b>
                {day.date ? <span>{day.date}</span> : null}
              </div>
            ))}
          </div>
          {laneDays.some((day) => ideasFor(day.key).length > 0) ? (
            <div className="ev-idea-row">
              <p className="ev-idea-rowlabel">Ideas</p>
              <div className="ev-idea-cells">
                {laneDays.map((day) => {
                  const all = ideasFor(day.key);
                  const expanded = openTray === day.key;
                  const shown = expanded ? all : all.slice(0, TRAY_CHIPS);
                  return (
                    <div key={day.key} className="ev-idea-cell">
                      {shown.map((idea) => (
                        <button
                          key={idea.id}
                          type="button"
                          className={`ev-idea-chip ${carrying?.id === idea.id ? "ev-idea-carried" : ""}`}
                          draggable={hydrated}
                          title="Drag onto an hour, or click to schedule it"
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", idea.id);
                            event.dataTransfer.effectAllowed = "copy";
                            setCarrying(idea);
                          }}
                          onDragEnd={() => { setCarrying(null); setLanding(null); }}
                          onClick={() => router.push(`${base}/plan?open=${idea.id}&sheet=schedule`)}
                        >
                          <span>{idea.title}</span>
                          {idea.scheduled > 0 ? <i aria-label="already scheduled">✓</i> : null}
                        </button>
                      ))}
                      {all.length > TRAY_CHIPS ? (
                        <button
                          type="button"
                          className="ev-idea-more"
                          onClick={() => setOpenTray(expanded ? null : day.key)}
                        >
                          {expanded ? "Fewer" : `+${all.length - TRAY_CHIPS}`}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {laneDays.some((day) => untimedFor(day.key).length > 0) ? (
            <div className="ev-untimed-row" style={{ marginLeft: 52 }}>
              {laneDays.map((day) => (
                <div key={day.key} className="ev-untimed-cell">
                  {untimedFor(day.key).map((moment) => (
                    <button
                      key={moment.id}
                      type="button"
                      className={`ev-untimed ${TRACK_CLASS[moment.track] ?? ""}`}
                      onClick={() => setOpenId(moment.id)}
                    >
                      <span>{moment.daypart}</span>
                      {moment.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          <div className="ev-grid-scroll">
            <div className="ev-grid-axis" style={{ height: gridHeight }}>
              {hours.map((minute) => (
                <span key={minute} style={{ top: (minute - dayStart) * PX_PER_MIN }}>
                  {hourLabel(minute)}
                </span>
              ))}
            </div>
            <div
              ref={gridRef}
              className="ev-grid"
              style={{ height: gridHeight }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
              onDragOver={(event) => {
                if (!carrying) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                const at = landingAt(event);
                if (at && (at.day !== landing?.day || at.minutes !== landing?.minutes)) setLanding(at);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setLanding(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const idea = carrying;
                const at = landingAt(event) ?? landing;
                setCarrying(null);
                setLanding(null);
                if (idea && at) setAsking({ idea, day: at.day, minutes: at.minutes });
              }}
            >
              {hours.map((minute) => (
                <div key={minute} className="ev-grid-hourline" style={{ top: (minute - dayStart) * PX_PER_MIN }} />
              ))}
              {laneDays.map((day) => (
                <div
                  key={day.key}
                  className={`ev-grid-col ${day.key === today ? "ev-grid-today" : ""} ${
                    landing?.day === day.key ? "ev-grid-landing" : ""
                  }`}
                >
                  {landing?.day === day.key ? (
                    <div
                      className="ev-drop-line"
                      style={{ top: (landing.minutes - dayStart) * PX_PER_MIN }}
                    >
                      <span>{fmt(landing.minutes)}</span>
                    </div>
                  ) : null}
                  {landed
                    .filter((entry) => entry.day === day.key)
                    .map((entry) => (
                      <div
                        key={entry.key}
                        className="ev-block ev-b-experience ev-block-landing"
                        style={{
                          top: (entry.minutes - dayStart) * PX_PER_MIN,
                          height: Math.max(MIN_BLOCK_PX, entry.length * PX_PER_MIN - 1),
                        }}
                      >
                        <span className="ev-block-time">{fmt(entry.minutes)}</span>
                        <span className="ev-block-title">{entry.title}</span>
                      </div>
                    ))}
                  {merged
                    .filter((moment) => {
                      if (moment.minutes === null) return false;
                      const shownDay = drag?.id === moment.id && drag.moved ? drag.previewDay : moment.day;
                      return shownDay === day.key;
                    })
                    .map((moment) => block(moment))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ev-daytabs" role="tablist" aria-label="Day">
            {laneDays.map((day) => (
              <button
                key={day.key}
                type="button"
                role="tab"
                aria-selected={day.key === activeDay?.key}
                onClick={() => setDayKey(day.key)}
              >
                {day.name.slice(0, 3)}
                <span className="ev-daytab-date">{day.date?.split(" ")[1] ?? ""}</span>
                {day.key === today ? <span className="ev-today-dot" aria-label="today" /> : null}
              </button>
            ))}
          </div>
          <div className="ev-timeline">
            {ideasFor(activeDay?.key ?? "").length > 0 ? (
              (() => {
                const all = ideasFor(activeDay?.key ?? "");
                const expanded = openTray === activeDay?.key;
                const shown = expanded ? all : all.slice(0, TRAY_CHIPS_DAY);
                return (
                  <div className="ev-idea-day">
                    <p className="ev-idea-rowlabel">Ideas for this day</p>
                    <div className="ev-idea-daycards">
                      {shown.map((idea) => (
                        <button
                          key={idea.id}
                          type="button"
                          className="ev-idea-chip"
                          onClick={() => router.push(`${base}/plan?open=${idea.id}&sheet=schedule`)}
                        >
                          <span>{idea.title}</span>
                          {idea.scheduled > 0 ? <i aria-label="already scheduled">✓</i> : null}
                        </button>
                      ))}
                      {all.length > TRAY_CHIPS_DAY ? (
                        <button
                          type="button"
                          className="ev-idea-more"
                          onClick={() => setOpenTray(expanded ? null : (activeDay?.key ?? null))}
                        >
                          {expanded ? "Fewer" : `+${all.length - TRAY_CHIPS_DAY} more`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ) : null}
            {timeline.map((moment) => (
              <button
                key={moment.id}
                type="button"
                className="ev-timeline-row"
                onClick={() => setOpenId(moment.id)}
              >
                {block(moment, true)}
              </button>
            ))}
          </div>
        </>
      )}

      {openMoment ? (
        <MomentDrawer
          moment={openMoment}
          role={role}
          route={route}
          days={laneDays}
          cues={cues.filter((cue) => cue.momentId === openMoment.id)}
          related={related.filter((row) => row.momentId === openMoment.id)}
          onClose={() => {
            setOpenId(null);
            setOverrides((prev) => {
              const next = new Map(prev);
              next.delete(openMoment.id);
              return next;
            });
          }}
        />
      ) : null}

      {asking ? (
        <HowLong
          idea={asking.idea}
          when={`${laneDays.find((day) => day.key === asking.day)?.name ?? ""} · ${fmt(asking.minutes)}`}
          onPick={(length) => schedule(asking.idea, asking.day, asking.minutes, length)}
          onClose={() => setAsking(null)}
        />
      ) : null}

      {addDay ? (
        <AddDrawer
          route={route}
          days={laneDays}
          presetDay={addDay}
          onClose={() => setAddDay(null)}
        />
      ) : null}
    </>
  );
}

function AddDrawer({
  route,
  days,
  presetDay,
  onClose,
}: {
  route: Route;
  days: DayLane[];
  presetDay: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label="Add a moment">
      <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={onClose} />
      <div className="ev-drawer">
        <div className="ev-drawer-head">
          <p className="ev-drawer-kicker">New moment</p>
          <button type="button" className="ev-drawer-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form
          className="ev-drawer-body"
          action={(formData) =>
            startTransition(async () => {
              const outcome = await createMoment(
                route.clientSlug, route.eventSlug, route.edition, formData,
              );
              if (outcome.ok) onClose();
              else setMessage(outcome.message ?? "That did not save.");
            })
          }
        >
          <div className="ev-field">
            <label>Title</label>
            <input name="title" required maxLength={160} autoFocus />
          </div>
          <div className="ev-form-grid">
            <div className="ev-field">
              <label>Day</label>
              <select name="day" defaultValue={presetDay}>
                {days.map((day) => (
                  <option key={day.key} value={day.key}>{day.name}</option>
                ))}
              </select>
            </div>
            <div className="ev-field">
              <label>Starts</label>
              <input name="starts" required placeholder="3:00 pm" />
            </div>
            <div className="ev-field">
              <label>Ends</label>
              <input name="ends" placeholder="4:00 pm" />
            </div>
          </div>
          <div className="ev-form-grid">
            <div className="ev-field">
              <label>Track</label>
              <select name="track" defaultValue="Program">
                {TRACKS.map((track) => <option key={track}>{track}</option>)}
              </select>
            </div>
            <div className="ev-field">
              <label>Status</label>
              <select name="status" defaultValue="draft">
                <option value="draft">Taking shape</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>
          <div className="ev-field">
            <label>Location</label>
            <input name="location" maxLength={120} />
          </div>
          <div className="ev-row-actions">
            <button type="submit" disabled={pending}>{pending ? "Adding" : "Add"}</button>
            <button type="button" className="ev-quiet" onClick={onClose}>Cancel</button>
          </div>
          {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------- the run of show, assembled */

/**
 * Nobody maintains a master run of show. This assembles one: every cue from
 * every scheduled moment, placed at its moment's start plus its own offset,
 * in order, grouped by day. On the event day the current and coming cue are
 * pinned on top, which is the whole phone experience during the weekend.
 */
function RosLens({
  cues,
  moments,
  days,
  today,
  nowMin,
  onOpen,
}: {
  cues: Cue[];
  moments: Moment[];
  days: DayLane[];
  today: string | null;
  nowMin: number;
  onOpen: (momentId: string) => void;
}) {
  const byMoment = new Map(moments.map((moment) => [moment.id, moment]));
  const rows = cues
    .map((cue) => {
      const moment = byMoment.get(cue.momentId);
      if (!moment || moment.minutes === null) return null;
      return { cue, moment, abs: moment.minutes + cue.offset };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const todayRows = today
    ? rows.filter((row) => row.moment.day === today).sort((a, b) => a.abs - b.abs)
    : [];
  const current = [...todayRows].reverse().find((row) => row.abs <= nowMin) ?? null;
  const next = todayRows.find((row) => row.abs > nowMin) ?? null;

  const pinned = (label: "Now" | "Next", row: { cue: Cue; moment: Moment; abs: number }) => (
    <button
      type="button"
      className={`ev-ros-pin ${label === "Now" ? "ev-ros-pin-now" : ""}`}
      onClick={() => onOpen(row.moment.id)}
    >
      <span className="ev-ros-pin-label">{label}</span>
      <span className="ev-ros-pin-cue">
        {fmt(row.abs)} · {row.cue.cue}
      </span>
      <span className="ev-ros-pin-sub">
        {[row.cue.who, row.moment.title].filter(Boolean).join(" · ")}
      </span>
    </button>
  );

  return (
    <div className="ev-ros">
      {current || next ? (
        <div className="ev-ros-pins">
          {current ? pinned("Now", current) : null}
          {next ? pinned("Next", next) : null}
        </div>
      ) : null}
      {days.map((day) => {
        const dayRows = rows
          .filter((row) => row.moment.day === day.key)
          .sort((a, b) => a.abs - b.abs || a.moment.title.localeCompare(b.moment.title));
        if (dayRows.length === 0) return null;
        return (
          <section key={day.key} className="ev-ros-day" aria-label={day.name}>
            <h3 className="ev-ros-dayname">
              {day.name}
              {day.date ? <span>{day.date}</span> : null}
            </h3>
            {dayRows.map((row) => (
              <button
                key={row.cue.id}
                type="button"
                className={`ev-ros-row ${
                  current?.cue.id === row.cue.id ? "ev-ros-row-now" : ""
                } ${next?.cue.id === row.cue.id ? "ev-ros-row-next" : ""}`}
                onClick={() => onOpen(row.moment.id)}
              >
                <span className="ev-ros-time">{fmt(row.abs)}</span>
                <span className="ev-ros-cue">
                  {row.cue.cue}
                  {row.cue.note ? <small>{row.cue.note}</small> : null}
                  <em>{row.moment.title}</em>
                </span>
                <span className="ev-ros-who">{row.cue.who ?? ""}</span>
              </button>
            ))}
          </section>
        );
      })}
      {rows.length === 0 ? (
        <p className="ev-row-detail">
          No cues yet. Open a scheduled moment and add its run of show.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The only question a dropped idea has to answer.
 *
 * It landed on a day and an hour, so the one thing left is how long it runs.
 * Nothing is approved, nothing is categorised, and the idea it came from is
 * untouched: an idea that already has a moment simply gains another.
 */
function HowLong({
  idea,
  when,
  onPick,
  onClose,
}: {
  idea: TentativeIdea;
  when: string;
  onPick: (length: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true" aria-label="How long">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <p className="ev-howlong-title">{idea.title}</p>
        <p className="ev-howlong-when">{when}</p>
        {idea.scheduled > 0 ? (
          <p className="ev-howlong-note">
            Already happening {idea.scheduled === 1 ? "once" : `${idea.scheduled} times`}. This adds
            another moment and keeps one idea.
          </p>
        ) : null}
        <p className="ws-modal-label">How long?</p>
        <div className="ws-modal-days">
          {DURATIONS.map((length) => (
            <button key={length} type="button" autoFocus={length === 30} onClick={() => onPick(length)}>
              {length < 60 ? `${length} min` : length === 60 ? "1 hour" : `${length / 60} hours`}
            </button>
          ))}
        </div>
        <div className="ws-modal-actions">
          <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
