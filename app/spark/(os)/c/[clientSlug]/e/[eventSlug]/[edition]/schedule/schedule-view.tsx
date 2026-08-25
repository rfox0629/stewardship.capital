"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { createMoment, deleteMoment, updateMoment } from "./actions";

/**
 * The weekend, two ways.
 *
 * Weekend: every day a lane, time flowing down, so a glance answers whether
 * one day is packed and another can breathe. Day: one day at a time, made for
 * a phone in a pocket. On a phone the day view is the default, with the
 * current day fronted during the weekend itself and Now and Next marked.
 *
 * Open space is content here, not absence: free time, lake time, and rest
 * render as their own quiet moments instead of disappearing into whitespace.
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
  sparkTitle: string | null;
  minutes: number | null;
};

export type DayLane = {
  key: string;
  name: string;
  date: string | null;
  moments: Moment[];
};

type Role = "planner" | "client" | "stakeholder";

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];

const TRACK_CLASS: Record<string, string> = {
  Program: "ev-cat-program",
  Meals: "ev-cat-meals",
  Experience: "ev-cat-experience",
  Hospitality: "ev-cat-hospitality",
  Logistics: "ev-cat-logistics",
  Worship: "ev-cat-worship",
};

/* Open space is announced by how a moment begins, so "founding with open
   hands" stays a session while "Open afternoon" breathes. */
const OPEN_SPACE = /^(free|open)\b|^rest\b|family time/i;

const nowMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

type Route = { clientSlug: string; eventSlug: string; edition: string };

/* ------------------------------------------------------- planner editing */

function MomentForm({
  route,
  days,
  moment,
  presetDay,
  onDone,
}: {
  route: Route;
  days: DayLane[];
  moment?: Moment;
  presetDay?: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="ev-capture ev-moment-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = moment
            ? await updateMoment(route.clientSlug, route.eventSlug, route.edition, moment.id, formData)
            : await createMoment(route.clientSlug, route.eventSlug, route.edition, formData);
          if (outcome.ok) onDone();
          else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      <div className="ev-form-grid">
        <div className="ev-field">
          <label>Day</label>
          <select name="day" defaultValue={moment?.day ?? presetDay ?? "thu"}>
            {days.map((day) => (
              <option key={day.key} value={day.key}>
                {day.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ev-field">
          <label>Starts</label>
          <input name="starts" defaultValue={moment?.starts ?? ""} placeholder="3:00 pm" required />
        </div>
        <div className="ev-field">
          <label>Ends</label>
          <input name="ends" defaultValue={moment?.ends ?? ""} placeholder="4:00 pm" />
        </div>
      </div>
      <div className="ev-field">
        <label>What is happening</label>
        <input name="title" defaultValue={moment?.title ?? ""} required maxLength={160} />
      </div>
      <div className="ev-form-grid">
        <div className="ev-field">
          <label>Track</label>
          <select name="track" defaultValue={moment?.track ?? "Program"}>
            {TRACKS.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </select>
        </div>
        <div className="ev-field">
          <label>Where</label>
          <input name="location" defaultValue={moment?.location ?? ""} maxLength={120} />
        </div>
        <div className="ev-field">
          <label>Standing</label>
          <select name="status" defaultValue={moment?.status ?? "draft"}>
            <option value="draft">Taking shape</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
      </div>
      <div className="ev-field">
        <label>Planning note, never shown to guests</label>
        <input name="note" defaultValue={moment?.note ?? ""} maxLength={400} />
      </div>
      <div className="ev-row-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Saving" : moment ? "Save" : "Add to the day"}
        </button>
        <button type="button" className="ev-quiet" disabled={pending} onClick={onDone}>
          Cancel
        </button>
        {moment ? (
          <button
            type="button"
            className="ev-quiet"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteMoment(route.clientSlug, route.eventSlug, route.edition, moment.id);
                onDone();
              })
            }
          >
            Remove
          </button>
        ) : null}
      </div>
      {message ? <p className="ev-row-detail" role="status">{message}</p> : null}
    </form>
  );
}

/* ------------------------------------------------------------- one card */

function MomentCard({
  moment,
  role,
  route,
  days,
  marker,
}: {
  moment: Moment;
  role: Role;
  route: Route;
  days: DayLane[];
  marker: "now" | "next" | null;
}) {
  const [editing, setEditing] = useState(false);
  const working = role !== "stakeholder";
  const open = OPEN_SPACE.test(moment.title);

  if (editing) {
    return <MomentForm route={route} days={days} moment={moment} onDone={() => setEditing(false)} />;
  }

  return (
    <div
      className={[
        "ev-moment",
        TRACK_CLASS[moment.track] ?? "ev-cat-logistics",
        open ? "ev-moment-open" : "",
        moment.status === "draft" ? "ev-moment-draft" : "",
      ].join(" ")}
    >
      <p className="ev-moment-time">
        {moment.starts}
        {moment.ends ? ` to ${moment.ends}` : ""}
        {marker ? (
          <span className={marker === "now" ? "ev-now" : "ev-next"}>
            {marker === "now" ? "Now" : "Next"}
          </span>
        ) : null}
        {working && moment.status === "draft" ? (
          <span className="ev-draft">Taking shape</span>
        ) : null}
      </p>
      <p className="ev-moment-title">{moment.title}</p>
      {moment.location ? <p className="ev-moment-where">{moment.location}</p> : null}
      {working && (moment.note || moment.sparkTitle) ? (
        <details className="ev-moment-more">
          <summary>Details</summary>
          {moment.note ? <p className="ev-slot-note">{moment.note}</p> : null}
          {moment.sparkTitle ? (
            <p className="ev-row-became">From the spark: {moment.sparkTitle}</p>
          ) : null}
        </details>
      ) : null}
      {role === "planner" ? (
        <button type="button" className="ev-moment-edit" onClick={() => setEditing(true)}>
          Edit
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ the view */

export function ScheduleView({
  days,
  role,
  route,
  today,
  base,
}: {
  days: DayLane[];
  role: Role;
  route: Route;
  /** The day key for today, when today falls inside the weekend. */
  today: string | null;
  base: string;
}) {
  /* A phone starts in the day view; a desk starts with the weekend. Lazy
     initialisation instead of an effect, so there is no flash and no
     cascading render. */
  const [view, setView] = useState<"weekend" | "day">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches
      ? "day"
      : "weekend",
  );
  const [dayKey, setDayKey] = useState<string>(today ?? days[0]?.key ?? "thu");
  const [adding, setAdding] = useState<string | null>(null);

  /* Now and Next only mean something on the day itself. */
  const markers = useMemo(() => {
    const result = new Map<string, "now" | "next">();
    if (!today) return result;
    const lane = days.find((day) => day.key === today);
    if (!lane) return result;
    const minutes = nowMinutes();
    const timed = lane.moments.filter((moment) => moment.minutes !== null);
    const current = [...timed].reverse().find((moment) => (moment.minutes as number) <= minutes);
    const next = timed.find((moment) => (moment.minutes as number) > minutes);
    if (current) result.set(current.id, "now");
    if (next) result.set(next.id, "next");
    return result;
  }, [days, today]);

  const planner = role === "planner";
  const working = role !== "stakeholder";
  const activeDay = days.find((day) => day.key === dayKey) ?? days[0];

  const lane = (day: DayLane) => (
    <div key={day.key} className={`ev-lane ${day.key === today ? "ev-lane-today" : ""}`}>
      <div className="ev-lane-head">
        <span className="ev-lane-name">{day.name}</span>
        {day.date ? <span className="ev-lane-date">{day.date}</span> : null}
      </div>
      {day.moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          role={role}
          route={route}
          days={days}
          marker={markers.get(moment.id) ?? null}
        />
      ))}
      {planner ? (
        adding === day.key ? (
          <MomentForm route={route} days={days} presetDay={day.key} onDone={() => setAdding(null)} />
        ) : (
          <button type="button" className="ev-lane-add" onClick={() => setAdding(day.key)}>
            Add a moment
          </button>
        )
      ) : null}
    </div>
  );

  return (
    <>
      <div className="ev-schedule-bar">
        <div className="ev-toggle" role="tablist" aria-label="Schedule view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "weekend"}
            onClick={() => setView("weekend")}
          >
            Weekend
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "day"}
            onClick={() => setView("day")}
          >
            Day
          </button>
        </div>
        {working ? (
          <Link className="ev-print-link" href={`${base}/schedule/print`}>
            Print preview
          </Link>
        ) : null}
      </div>

      {view === "weekend" ? (
        <div className="ev-weekend">{days.map(lane)}</div>
      ) : (
        <>
          <div className="ev-daytabs" role="tablist" aria-label="Day">
            {days.map((day) => (
              <button
                key={day.key}
                type="button"
                role="tab"
                aria-selected={day.key === activeDay?.key}
                onClick={() => setDayKey(day.key)}
              >
                {day.name.slice(0, 3)}
                {day.key === today ? <span className="ev-today-dot" aria-label="today" /> : null}
              </button>
            ))}
          </div>
          {activeDay ? <div className="ev-dayview">{lane(activeDay)}</div> : null}
        </>
      )}
    </>
  );
}
