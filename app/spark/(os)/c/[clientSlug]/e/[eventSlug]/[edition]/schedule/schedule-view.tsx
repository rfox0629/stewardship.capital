"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

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
 * The weekend as a working calendar: time down, days across, moments as
 * compact blocks a planner can pick up and move.
 *
 * Dragging a block vertically changes its time; across, its day; the handle
 * at its foot, its length. Every commit is one deliberate release, applied
 * optimistically and reverted with a message if the database refuses. A drag
 * is never the only way: every block opens a drawer where the same fields
 * are plain inputs.
 */

export type Moment = {
  id: string;
  day: string;
  starts: string;
  ends: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
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

export type TentativeSpark = {
  id: string;
  title: string;
  status: string;
  day: string;
  daypart: string;
};

/** Where each daypart's ghosts sit on the time axis. Approximate on
 *  purpose: a tentative idea has a neighbourhood, not a time. */
const DAYPART_BAND: Record<string, number> = {
  morning: 8 * 60 + 15,
  afternoon: 13 * 60 + 30,
  evening: 18 * 60 + 45,
  anytime: 21 * 60 + 30,
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

const PX_PER_MIN = 0.92;
const SNAP = 15;
const DEFAULT_LEN = 60;

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

type DrawerTab = "details" | "ros" | "tasks" | "resources";

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
    return wanted === "ros" || wanted === "tasks" || wanted === "resources"
      ? wanted
      : "details";
  });
  const planner = role === "planner";

  const tabs: Array<{ key: DrawerTab; label: string }> = [
    { key: "details", label: "Details" },
    { key: "ros", label: `Run of show${cues.length ? ` · ${cues.length}` : ""}` },
    { key: "tasks", label: "Tasks" },
    { key: "resources", label: "Resources" },
  ];

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
          <div className="ev-drawer-tabs" role="tablist" aria-label="Moment">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}

        {planner && tab === "ros" ? (
          <RosEditor moment={moment} cues={cues} route={route} />
        ) : null}
        {planner && tab === "tasks" ? (
          <MomentRecords
            moment={moment}
            rows={related.filter((row) => row.kind === "task")}
            kind="task"
            route={route}
          />
        ) : null}
        {planner && tab === "resources" ? (
          <MomentRecords
            moment={moment}
            rows={related.filter((row) => row.kind === "resource")}
            kind="resource"
            route={route}
          />
        ) : null}

        {planner && tab === "details" ? (
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
                <input name="starts" defaultValue={moment.starts} required placeholder="3:00 pm" />
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
                <b>Spark</b> {moment.sparkTitle}
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
        {!planner ? (
          <div className="ev-drawer-body">
            <h3 className="ev-drawer-title">{moment.title}</h3>
            <p className="ev-drawer-line">
              {days.find((day) => day.key === moment.day)?.name}, {moment.starts}
              {moment.ends ? ` to ${moment.ends}` : ""}
            </p>
            {moment.location ? <p className="ev-drawer-line">{moment.location}</p> : null}
            {role === "client" && moment.note ? (
              <p className="ev-drawer-note">{moment.note}</p>
            ) : null}
            {role === "client" && moment.sparkTitle ? (
              <p className="ev-drawer-spark"><b>Spark</b> {moment.sparkTitle}</p>
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
        {moment.title} · {moment.starts}
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
              {cue.note ? <small>{cue.note}</small> : null}
              {length !== null && cue.offset > length ? (
                <small className="ev-cue-warn">past the end of this moment</small>
              ) : null}
            </span>
            <span className="ev-cue-who">{cue.who ?? ""}</span>
          </button>
        ),
      )}
      {editing === null || editing === "new" ? cueForm(null) : null}
      {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
    </div>
  );
}

/* ------------------------------------- what this moment needs, recorded */

function MomentRecords({
  moment,
  rows,
  kind,
  route,
}: {
  moment: Moment;
  rows: RelatedRecord[];
  kind: "task" | "resource";
  route: Route;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="ev-drawer-body">
      {rows.length > 0 ? (
        rows.map((row) => (
          <p key={`${row.kind}-${row.id}`} className="ev-drawer-noteline">
            {row.label}
            <span>{row.sub}</span>
          </p>
        ))
      ) : (
        <p className="ev-row-detail">
          {kind === "task" ? "No tasks for this moment yet." : "Nothing needed yet."}
        </p>
      )}
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
        {kind === "task" ? (
          <div className="ev-cue-form-grid">
            <label>
              Task
              <input name="title" maxLength={160} required />
            </label>
            <label>
              Who
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
            {kind === "task" ? "Add task" : "Add resource"}
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
  tentative?: TentativeSpark[];
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
  const [dayKey, setDayKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const wanted = new URLSearchParams(window.location.search).get("day");
      if (wanted) return wanted;
    }
    return today ?? "thu";
  });
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("open")
      : null,
  );
  const [addDay, setAddDay] = useState<string | null>(null);
  const [showSparks, setShowSparks] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("sparks") === "1",
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
  const gridRef = useRef<HTMLDivElement>(null);
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
  const dayStart = useMemo(() => {
    const starts = merged.map((moment) => moment.minutes ?? 8 * 60);
    return Math.min(7 * 60, Math.floor(Math.min(...starts, 7 * 60) / 60) * 60);
  }, [merged]);
  const dayEnd = useMemo(() => {
    const ends = merged.map(
      (moment) => moment.endMinutes ?? (moment.minutes ?? 8 * 60) + DEFAULT_LEN,
    );
    return Math.max(22 * 60, Math.ceil(Math.max(...ends, 22 * 60) / 60) * 60);
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
    const length = (shown.endMinutes ?? start + DEFAULT_LEN) - start;
    const marker = markers.get(moment.id);
    const open = OPEN_SPACE.test(moment.title);

    const classes = [
      "ev-block",
      TRACK_CLASS[moment.track] ?? "ev-b-logistics",
      moment.status === "draft" ? "ev-block-draft" : "",
      open ? "ev-block-open" : "",
      dragging ? "ev-block-dragging" : "",
      inTimeline ? "ev-block-row" : "",
    ].join(" ");

    const style = inTimeline
      ? undefined
      : {
          top: (start - dayStart) * PX_PER_MIN,
          height: Math.max(26, length * PX_PER_MIN - 2),
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
          {shown.starts}
          {marker ? (
            <em className={marker === "now" ? "ev-now" : "ev-next"}>
              {marker === "now" ? "Now" : "Next"}
            </em>
          ) : null}
        </span>
        <span className="ev-block-title">{moment.title}</span>
        {!inTimeline && length >= 45 && moment.location ? (
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
  const ghostsFor = (dayKey: string) => {
    if (!shownSparks || !planner) return [];
    const grouped = new Map<string, TentativeSpark[]>();
    for (const spark of tentative.filter((candidate) => candidate.day === dayKey)) {
      const band = spark.daypart in DAYPART_BAND ? spark.daypart : "anytime";
      grouped.set(band, [...(grouped.get(band) ?? []), spark]);
    }
    return [...grouped.entries()];
  };
  const shownDayKey = hydrated ? dayKey : (today ?? "thu");
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
              {shownSparks ? "Sparks on" : "Sparks"}
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
            >
              {hours.map((minute) => (
                <div key={minute} className="ev-grid-hourline" style={{ top: (minute - dayStart) * PX_PER_MIN }} />
              ))}
              {laneDays.map((day) => (
                <div key={day.key} className={`ev-grid-col ${day.key === today ? "ev-grid-today" : ""}`}>
                  {ghostsFor(day.key).map(([band, sparks]) => (
                    <div
                      key={band}
                      className="ev-ghosts"
                      style={{ top: (DAYPART_BAND[band] - dayStart) * PX_PER_MIN }}
                    >
                      {sparks.map((spark) => (
                        <Link
                          key={spark.id}
                          className={`ev-ghost ev-ghost-${spark.status}`}
                          href={`${base}/sparks?open=${spark.id}`}
                          title={`Spark, ${spark.status}: ${spark.title}`}
                        >
                          {spark.title}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {merged
                    .filter((moment) => {
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
            {ghostsFor(activeDay?.key ?? "").length > 0 ? (
              <div className="ev-ghost-day">
                <span className="ev-drawer-sub">Sparks that might land here</span>
                {ghostsFor(activeDay?.key ?? "").flatMap(([band, sparks]) =>
                  sparks.map((spark) => (
                    <Link
                      key={spark.id}
                      className={`ev-ghost ev-ghost-${spark.status}`}
                      href={`${base}/sparks?open=${spark.id}`}
                    >
                      {spark.title}
                      <i>{band}</i>
                    </Link>
                  )),
                )}
              </div>
            ) : null}
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
