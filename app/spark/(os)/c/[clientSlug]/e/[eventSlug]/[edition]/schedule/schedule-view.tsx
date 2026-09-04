"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { parseTimeLabel } from "@lib/spark/days";
import { pendingBlocks, unscheduledIdeas } from "@lib/spark/weekend";
import { Select } from "@spark/_components/select";

import { scheduleIdea } from "../plan/actions";

import {
  addActivity,
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
import { placeIdeaInMoment } from "../plan/actions";

/**
 * The canvas.
 *
 * The weekend as a working calendar: time down, days across, moments as
 * compact blocks a planner can pick up and move.
 *
 * One canvas, two layers. Underneath, what is actually happening: solid
 * blocks at their hours, and softly banded regions for the moments the sheet
 * gives a part of the day rather than a time. Over the top, when asked for,
 * what is only being considered: the same days' ideas as ghosts, in their own
 * lane, at whatever precision they actually have. Nothing floats above the
 * calendar pretending to belong to it.
 *
 * Dragging a block vertically changes its time; across, its day; the handle
 * at its foot, its length. Dragging a ghost onto an hour is what turns a
 * guess into a moment: the idea stays where it is and gains a scheduled
 * moment pointing back at it. Clicking one does the same without the aim.
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
  /** Minutes from the moment's start, or null for something it merely
   *  contains: a boat ride during free time starts when it starts. */
  offset: number | null;
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

/* Two drags exist on this screen and they mean opposite things. Carrying an
   idea creates a moment; carrying a moment moves that exact row. They use
   different machinery on purpose, and the one that creates says so in its own
   payload type, so nothing can arrive at the create path by accident. */
const IDEA_DRAG = "application/x-spark-idea";
/* A moment waiting for a time. Dropping it on an hour gives it one; it is
   already real, so nothing is created and nothing is asked. */
const MOMENT_DRAG = "application/x-spark-moment";

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

type DrawerTab = "details" | "ros" | "actions" | "activities";

function MomentDrawer({
  moment,
  role,
  route,
  days,
  cues,
  related,
  ideas,
  onClose,
}: {
  moment: Moment;
  role: Role;
  route: Route;
  days: DayLane[];
  cues: Cue[];
  related: RelatedRecord[];
  ideas: TentativeIdea[];
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
  const [expanded, setExpanded] = useState<"ros" | "actions" | "activities" | null>(
    tab === "ros" ? "ros" : tab === "actions" ? "actions" : null,
  );

  /* The two kinds of thing a moment holds, told apart by whether they ever
     claimed a time of their own. */
  const beats = cues.filter((cue) => cue.offset !== null);
  const inside = cues.filter((cue) => cue.offset === null);

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
            {/* What this moment contains, and then exactly how it runs. Both
                are the same relationship underneath; an activity is simply a
                cue that never claimed a time. */}
            <button
              type="button"
              className="ev-expander"
              aria-expanded={expanded === "activities"}
              onClick={() => setExpanded(expanded === "activities" ? null : "activities")}
            >
              <b>Activities</b>
              <span>
                {inside.length > 0
                  ? inside.map((cue) => cue.cue).join(", ")
                  : "What happens inside this"}
              </span>
              <i aria-hidden="true">{expanded === "activities" ? "−" : "+"}</i>
            </button>
            {expanded === "activities" ? (
              <ActivityEditor moment={moment} activities={inside} route={route} ideas={ideas} />
            ) : null}

            <button
              type="button"
              className="ev-expander"
              aria-expanded={expanded === "ros"}
              onClick={() => setExpanded(expanded === "ros" ? null : "ros")}
            >
              <b>Run of show</b>
              <span>{beats.length > 0 ? `${beats.length} cues` : "Add the first cue"}</span>
              <i aria-hidden="true">{expanded === "ros" ? "−" : "+"}</i>
            </button>
            {expanded === "ros" ? (
              <RosEditor moment={moment} cues={beats} route={route} ideas={ideas} />
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
  ideas,
}: {
  moment: Moment;
  cues: Cue[];
  route: Route;
  ideas: TentativeIdea[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /* Two ways to add a beat: write one, or point at an idea that already
     exists. The second links through spark_id rather than copying, so the
     idea keeps its actions, requirements and cost while happening inside
     somebody else's moment and never needing an hour of its own. */
  const [source, setSource] = useState<"new" | "idea">("new");
  const [fromIdea, setFromIdea] = useState(ideas[0]?.id ?? "");

  const start = moment.minutes;
  const length =
    start !== null && moment.endMinutes !== null ? moment.endMinutes - start : null;
  /* The drawer hands over only the timed ones. */
  const beats = [...cues].sort((a, b) => (a.offset as number) - (b.offset as number));
  const base = `/spark/c/${route.clientSlug}/e/${route.eventSlug}/${route.edition}`;

  /* Pointing at an idea rather than writing a beat. The cue carries the
     idea's id, so the idea keeps everything hanging off it and gains a place
     in the weekend without a calendar block of its own. */
  const fromIdeaForm = (
    <form
      className="ev-cue-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await placeIdeaInMoment(
            route.clientSlug, route.eventSlug, route.edition,
            fromIdea, moment.id, String(formData.get("offset") ?? "0"),
          );
          if (outcome.ok) { setSource("new"); setMessage(null); }
          else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      <div className="ev-cue-form-grid">
        <label>
          Min
          <input name="offset" type="number" step={1} defaultValue={0} required />
        </label>
        <span className="ev-cue-pick">
          <Select label="Which idea" value={fromIdea} onChange={setFromIdea} compact
            options={ideas.map((idea) => ({ value: idea.id, label: idea.title }))} />
        </span>
      </div>
      <div className="ev-row-actions">
        <button type="submit" disabled={pending || !fromIdea}>Add cue</button>
        <button type="button" className="ev-quiet" onClick={() => setSource("new")}>Cancel</button>
      </div>
      <p className="ev-ros-hint">
        The idea stays where it is. This links it here rather than copying it,
        so its actions, requirements and cost stay in one place.
      </p>
    </form>
  );

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
        with it. For something that happens in here without a time of its own,
        use Activities.
      </p>
      {beats.map((cue) =>
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
              {fmtOffset(cue.offset as number)}
              {start !== null ? <i>{fmt(start + (cue.offset as number))}</i> : null}
            </span>
            <span className="ev-cue-text">
              {cue.cue}
              {cue.ideaId ? <small className="ev-cue-idea">From an idea</small> : null}
              {cue.note ? <small>{cue.note}</small> : null}
              {length !== null && (cue.offset as number) > length ? (
                <small className="ev-cue-warn">past the end of this moment</small>
              ) : null}
            </span>
            <span className="ev-cue-who">{cue.who ?? ""}</span>
          </button>
        ),
      )}
      {beats.some((cue) => cue.ideaId) ? (
        <div className="ev-cue-ideas">
          {beats.filter((cue) => cue.ideaId).map((cue) => (
            <Link key={`idea-${cue.id}`} className="ws-link" href={`${base}/plan?open=${cue.ideaId}`}>
              <b>Idea</b> {cue.cue}
            </Link>
          ))}
        </div>
      ) : null}
      {editing === null || editing === "new" ? (
        <>
          <div className="ev-cue-source" role="group" aria-label="Where the cue comes from">
            <button type="button" aria-pressed={source === "new"} onClick={() => setSource("new")}>
              New cue
            </button>
            <button type="button" aria-pressed={source === "idea"} disabled={ideas.length === 0}
              onClick={() => setSource("idea")}>
              From idea
            </button>
          </div>
          {source === "new" ? cueForm(null) : fromIdeaForm}
        </>
      ) : null}
      {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
    </div>
  );
}

/**
 * What happens inside a moment, without a time of its own.
 *
 * Free time runs from one to four and a boat ride happens during it. Giving
 * that boat ride a start of 1:15 would be writing down a decision nobody
 * made, so it is held as something the block contains: the same relationship
 * a cue uses, with the offset left empty. It can come from nothing, or from
 * an idea that already exists, in which case it stays linked rather than
 * copied and keeps its actions, its requirements and its cost.
 */
function ActivityEditor({
  moment,
  activities,
  route,
  ideas,
}: {
  moment: Moment;
  activities: Cue[];
  route: Route;
  ideas: TentativeIdea[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<"new" | "idea">("new");
  const [fromIdea, setFromIdea] = useState(ideas[0]?.id ?? "");
  const base = `/spark/c/${route.clientSlug}/e/${route.eventSlug}/${route.edition}`;

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const outcome = await fn();
      if (outcome.ok) setMessage(null);
      else setMessage(outcome.message ?? "That did not save.");
    });

  return (
    <div className="ev-drawer-body">
      <p className="ev-ros-hint">
        Things this moment contains. They take no clock time of their own.
      </p>

      {activities.map((activity) => (
        <div key={activity.id} className="ev-activity-row">
          <span className="ev-activity-name">
            {activity.cue}
            {activity.ideaId ? (
              <Link className="ev-cue-idea" href={`${base}/plan?open=${activity.ideaId}`}>
                From an idea
              </Link>
            ) : null}
          </span>
          <button
            type="button"
            className="ev-quiet"
            disabled={pending}
            onClick={() =>
              run(() => deleteCue(route.clientSlug, route.eventSlug, route.edition, activity.id))
            }
          >
            Remove
          </button>
        </div>
      ))}

      <div className="ev-cue-source" role="group" aria-label="Where the activity comes from">
        <button type="button" aria-pressed={source === "new"} onClick={() => setSource("new")}>
          New
        </button>
        <button type="button" aria-pressed={source === "idea"} disabled={ideas.length === 0}
          onClick={() => setSource("idea")}>
          From idea
        </button>
      </div>

      {source === "new" ? (
        <form
          className="ev-cue-form"
          action={(formData) =>
            run(async () => {
              const outcome = await addActivity(
                route.clientSlug, route.eventSlug, route.edition, moment.id,
                String(formData.get("name") ?? ""),
              );
              return outcome;
            })
          }
        >
          <label className="ev-cue-note">
            What happens in here
            <input name="name" maxLength={300} required placeholder="Boat ride" />
          </label>
          <div className="ev-row-actions">
            <button type="submit" disabled={pending}>Add activity</button>
          </div>
        </form>
      ) : (
        <form
          className="ev-cue-form"
          action={() =>
            run(() =>
              placeIdeaInMoment(
                route.clientSlug, route.eventSlug, route.edition, fromIdea, moment.id, "",
              ),
            )
          }
        >
          <span className="ev-cue-pick">
            <Select label="Which idea" value={fromIdea} onChange={setFromIdea} compact
              options={ideas.map((idea) => ({ value: idea.id, label: idea.title }))} />
          </span>
          <div className="ev-row-actions">
            <button type="submit" disabled={pending || !fromIdea}>Add activity</button>
          </div>
          <p className="ev-ros-hint">
            The idea stays where it is and keeps everything attached to it. No
            time is invented for it.
          </p>
        </form>
      )}

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
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /* An idea in the air, where it would land, and what is asking for its
     length. Separate from the block drag above: that moves something that
     already exists, this brings something into existence. */
  const [carrying, setCarrying] = useState<TentativeIdea | null>(null);
  const [landing, setLanding] = useState<{ day: string; minutes: number } | null>(null);
  const [asking, setAsking] =
    useState<{ idea: TentativeIdea; day: string; minutes: number | null } | null>(null);
  /* A real moment being given its hour, either dragged onto one or opened. */
  const [carryingMoment, setCarryingMoment] = useState<Moment | null>(null);
  const [placing, setPlacing] = useState<Moment | null>(null);
  const [placed, setPlaced] = useState<
    Array<{
      key: string; ideaId: string; title: string; day: string; minutes: number; length: number;
      /** The row this became, once the server says which one it is. */
      id: string | null;
    }>
  >([]);
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
        /* A moment moves by pointer, never by the browser's drag. Saying so
           out loud is what keeps the moving path and the creating path from
           ever meeting. */
        draggable={false}
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
        {!inTimeline && activitiesOf(moment.id).length > 0 ? (
          <span className="ev-block-activities">
            {activitiesOf(moment.id).map((activity) => (
              <em key={activity.id}>{activity.cue}</em>
            ))}
          </span>
        ) : null}
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
  /* Everything the weekend has decided on but not yet timed. It belongs to a
     day and it is real, so it is not an idea; it simply has no hour. It waits
     in a bank above the calendar rather than being drawn at one, because a
     block at six in the morning is a claim nobody made. */
  const needsPlacement = merged.filter((moment) => moment.minutes === null);
  const needsPlacementFor = (dayKey: string) =>
    needsPlacement.filter((moment) => moment.day === dayKey);

  /* A day's loose ideas: still being considered, not yet anywhere. Shown only
     when asked for, and never as a block, because an idea has no time. */
  const ideasFor = (dayKey: string) =>
    shownSparks && planner
      ? unscheduledIdeas(tentative.filter((idea) => idea.day === dayKey))
      : [];

  /* What each timed block contains. These ride with their parent rather than
     claiming hours of their own. */
  const activitiesOf = (momentId: string) =>
    cues.filter((cue) => cue.momentId === momentId && cue.offset === null);

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
  const schedule = (
    idea: TentativeIdea,
    day: string,
    minutes: number | null,
    length: number,
    daypart?: string,
  ) => {
    const key = `${idea.id}-${day}-${minutes ?? daypart ?? "open"}-${Date.now()}`;
    if (minutes !== null) {
      setPlaced((prev) => [...prev,
        { key, ideaId: idea.id, title: idea.title, day, minutes, length, id: null }]);
    }
    setAsking(null);
    setFailure(null);
    startTransition(async () => {
      const outcome = await scheduleIdea(
        route.clientSlug, route.eventSlug, route.edition, idea.id,
        minutes !== null
          ? { day, starts: fmt(minutes), minutes: String(length), track: "Experience" }
          : { day, daypart: daypart ?? "anytime", track: "Experience" },
      );
      if (!outcome.ok) {
        setPlaced((prev) => prev.filter((entry) => entry.key !== key));
        setFailure(outcome.message ?? "That did not schedule, so nothing was added.");
        return;
      }
      setPlaced((prev) =>
        prev.map((entry) => (entry.key === key ? { ...entry, id: outcome.id ?? null } : entry)));
    });
  };

  /* Giving a waiting moment its hour. It already exists, so this is the same
     update a drag of a placed block makes: the row moves, nothing is born. */
  const giveTime = (moment: Moment, day: string, minutes: number, length: number) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(moment.id, { day, minutes, endMinutes: minutes + length });
      return next;
    });
    setPlacing(null);
    setFailure(null);
    startTransition(async () => {
      const outcome = await rescheduleMoment(
        route.clientSlug, route.eventSlug, route.edition, moment.id,
        { day, starts: fmt(minutes), ends: fmt(minutes + length) },
      );
      if (!outcome.ok) {
        setOverrides((prev) => {
          const next = new Map(prev);
          next.delete(moment.id);
          return next;
        });
        setFailure("That did not save, so it is still waiting for a time.");
      }
    });
  };

  /* A moment drawn the instant it is dropped stops being drawn the instant
     its own row arrives. It is retired by identity, never by the hour it was
     dropped on: the block can be moved a second later, and a placeholder that
     asked "is anything still at eight?" would answer no and draw itself again
     beside the moment it was standing in for. */
  const landed = pendingBlocks(placed, moments, fmt);
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
  /* The phone gets the same canvas, flattened: what is happening and, when
     ideas are shown, what is being considered, in the order the day runs.
     An untimed moment sorts to the head of its own part of the day. */
  const dayKeyNow = activeDay?.key ?? "";
  /* The phone gets the same three layers, flattened: what still needs a time,
     then the day on the clock, then what is only being considered. */
  const dayTimed = merged
    .filter((moment) => moment.day === dayKeyNow && moment.minutes !== null)
    .sort((a, b) => (a.minutes as number) - (b.minutes as number));

  return (
    <>
      <div className="ev-schedule-bar">
        <div className="ev-bar-left" />
        <div className="ev-bar-right">
          {failure ? <span className="ev-bar-failure" role="status">{failure}</span> : null}
          {planner && tentative.length > 0 ? (
            <button
              type="button"
              className={`ev-bar-toggle ${shownSparks ? "ev-bar-toggle-on" : ""}`}
              aria-pressed={shownSparks}
              onClick={() => setShowSparks((current) => !current)}
            >
              {shownSparks ? "Ideas shown" : "Show ideas"}
            </button>
          ) : null}
          {/* This screen is the schedule, so its add button adds to the
              schedule. Considering something is what Ideas is for. */}
          {planner ? (
            <button type="button" className="ev-bar-add"
              onClick={() => setAddDay(activeDay?.key ?? "thu")}>
              <span aria-hidden="true">+</span> Add moment
            </button>
          ) : null}
          <button type="button" className="ev-bar-quiet"
            onClick={() => setView(shownView === "weekend" ? "day" : "weekend")}>
            {shownView === "weekend" ? "Day view" : "Whole weekend"}
          </button>
          {role !== "stakeholder" ? (
            <Link className="ev-print-link" href={`${base}/schedule/print`}>
              Print
            </Link>
          ) : null}
        </div>
      </div>

      {shownView === "weekend" && needsPlacement.length > 0 ? (
        <div className="ev-bank">
          <p className="ev-bank-label">
            Needs placement <span>{needsPlacement.length}</span>
          </p>
          <div className="ev-bank-days">
            {laneDays.map((day) => (
              <div key={day.key} className="ev-bank-day-cell">
                {needsPlacementFor(day.key).map((moment) => (
                  <button
                    key={moment.id}
                    type="button"
                    className={`ev-bank-chip ${carryingMoment?.id === moment.id ? "ev-bank-carried" : ""}`}
                    draggable={hydrated && planner}
                    title="Drag onto an hour, or click to give it a time"
                    onDragStart={(event) => {
                      event.dataTransfer.setData(MOMENT_DRAG, moment.id);
                      event.dataTransfer.setData("text/plain", moment.title);
                      event.dataTransfer.effectAllowed = "move";
                      setCarryingMoment(moment);
                    }}
                    onDragEnd={() => { setCarryingMoment(null); setLanding(null); }}
                    onClick={() => setPlacing(moment)}
                  >
                    <span>{moment.title}</span>
                    {moment.daypart ? <i>{moment.daypart}</i> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {shownView === "weekend" ? (
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
              onDragOver={(event) => {
                const idea = carrying && event.dataTransfer.types.includes(IDEA_DRAG);
                const waiting = carryingMoment && event.dataTransfer.types.includes(MOMENT_DRAG);
                if (!idea && !waiting) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = idea ? "copy" : "move";
                const at = landingAt(event);
                if (at && (at.day !== landing?.day || at.minutes !== landing?.minutes)) setLanding(at);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setLanding(null);
              }}
              onDrop={(event) => {
                /* Three drags, and only one of them creates anything. An idea
                   becomes a new moment. A moment waiting for a time is given
                   one, in place. A moment already on the clock never arrives
                   here at all: that is a pointer drag on the block itself,
                   and blocks are not draggable in the browser's sense. */
                const isIdea = event.dataTransfer.types.includes(IDEA_DRAG);
                const isWaiting = event.dataTransfer.types.includes(MOMENT_DRAG);
                if (!isIdea && !isWaiting) return;
                event.preventDefault();
                const at = landingAt(event) ?? landing;
                const idea = carrying;
                const waiting = carryingMoment;
                setCarrying(null);
                setCarryingMoment(null);
                setLanding(null);
                if (!at) return;
                if (isIdea && idea) setAsking({ idea, day: at.day, minutes: at.minutes });
                else if (isWaiting && waiting) giveTime(waiting, at.day, at.minutes, 60);
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
      ) : null}

      {shownView === "weekend" && laneDays.some((day) => ideasFor(day.key).length > 0) ? (
        <div className="ev-bank ev-bank-ideas">
          <p className="ev-bank-label">
            Ideas <span>{laneDays.reduce((n, day) => n + ideasFor(day.key).length, 0)}</span>
          </p>
          <div className="ev-bank-days">
            {laneDays.map((day) => (
              <div key={day.key} className="ev-bank-day-cell">
                {ideasFor(day.key).map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    className={`ev-bank-chip ev-bank-idea ${
                      carrying?.id === idea.id ? "ev-bank-carried" : ""}`}
                    draggable={hydrated && planner}
                    title="Drag onto an hour, or click to place it"
                    onDragStart={(event) => {
                      event.dataTransfer.setData(IDEA_DRAG, idea.id);
                      event.dataTransfer.setData("text/plain", idea.title);
                      event.dataTransfer.effectAllowed = "copy";
                      setCarrying(idea);
                    }}
                    onDragEnd={() => { setCarrying(null); setLanding(null); }}
                    onClick={() => setAsking({ idea, day: day.key, minutes: null })}
                  >
                    <span>{idea.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {shownView === "day" ? (
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
          {needsPlacementFor(dayKeyNow).length > 0 ? (
            <div className="ev-bank ev-bank-day">
              <p className="ev-bank-label">
                Needs placement <span>{needsPlacementFor(dayKeyNow).length}</span>
              </p>
              <div className="ev-bank-cards">
                {needsPlacementFor(dayKeyNow).map((moment) => (
                  <button key={moment.id} type="button" className="ev-bank-chip"
                    onClick={() => setPlacing(moment)}>
                    <span>{moment.title}</span>
                    {moment.daypart ? <i>{moment.daypart}</i> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="ev-timeline">
            {dayTimed.map((moment) => (
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

          {ideasFor(dayKeyNow).length > 0 ? (
            <div className="ev-bank ev-bank-ideas ev-bank-day">
              <p className="ev-bank-label">
                Ideas for this day <span>{ideasFor(dayKeyNow).length}</span>
              </p>
              <div className="ev-bank-cards">
                {ideasFor(dayKeyNow).map((idea) => (
                  <button key={idea.id} type="button" className="ev-bank-chip ev-bank-idea"
                    onClick={() => setAsking({ idea, day: dayKeyNow, minutes: null })}>
                    <span>{idea.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {openMoment ? (
        <MomentDrawer
          moment={openMoment}
          role={role}
          route={route}
          days={laneDays}
          cues={cues.filter((cue) => cue.momentId === openMoment.id)}
          related={related.filter((row) => row.momentId === openMoment.id)}
          ideas={tentative}
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
        <AddToSchedule
          idea={asking.idea}
          dayName={laneDays.find((day) => day.key === asking.day)?.name ?? ""}
          minutes={asking.minutes}
          blocks={merged
            .filter((moment) => moment.day === asking.day && moment.minutes !== null)
            .sort((a, b) => (a.minutes as number) - (b.minutes as number))
            .map((moment) => ({ id: moment.id, label: `${moment.starts} ${moment.title}` }))}
          onInside={(momentId) =>
            startTransition(async () => {
              const outcome = await placeIdeaInMoment(
                route.clientSlug, route.eventSlug, route.edition,
                asking.idea.id, momentId, "",
              );
              setAsking(null);
              if (!outcome.ok) setFailure(outcome.message ?? "That did not save.");
            })}
          onSchedule={(minutes, length) =>
            schedule(asking.idea, asking.day, minutes, length, asking.idea.daypart)}
          onOpenEnded={() =>
            schedule(asking.idea, asking.day, null, 0, asking.idea.daypart)}
          onClose={() => setAsking(null)}
        />
      ) : null}

      {placing ? (
        <GiveTime
          moment={placing}
          dayName={laneDays.find((day) => day.key === placing.day)?.name ?? ""}
          onPlace={(minutes, length) => giveTime(placing, placing.day, minutes, length)}
          onClose={() => setPlacing(null)}
        />
      ) : null}

      {addDay ? (
        <AddMomentSheet
          route={route}
          days={laneDays}
          presetDay={addDay}
          onClose={() => setAddDay(null)}
        />
      ) : null}

    </>
  );
}

/**
 * Adding something we already know is happening.
 *
 * Breakfast does not need to be brainstormed before it can be scheduled, so
 * this door exists and creates a moment with no idea behind it. It asks what
 * is happening, when, and for how long, and nothing else: a start and a
 * length is how a planning meeting actually talks, and the end is arithmetic.
 * Location and track are there for the person who wants them and invisible
 * to the person who does not.
 */
function AddMomentSheet({
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
  const [day, setDay] = useState(presetDay);
  const [length, setLength] = useState(60);
  const [more, setMore] = useState(false);

  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true"
      aria-label="Add to the schedule">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <form
          action={(formData) =>
            startTransition(async () => {
              formData.set("day", day);
              formData.set("minutes", String(length));
              const outcome = await createMoment(
                route.clientSlug, route.eventSlug, route.edition, formData,
              );
              if (outcome.ok) onClose();
              else setMessage(outcome.message ?? "That did not save.");
            })
          }
        >
          <label className="ws-modal-label" htmlFor="moment-title">What is happening?</label>
          <input id="moment-title" className="ws-modal-input" name="title" required maxLength={160}
            autoFocus placeholder="Lunch" />

          <p className="ws-modal-label">When?</p>
          <div className="ev-when-row">
            <Select label="Day" value={day} onChange={setDay} compact
              options={days.map((lane) => ({ value: lane.key, label: lane.name }))} />
            <input className="ev-when-time" name="starts" required placeholder="12:00 pm"
              aria-label="Start time" />
          </div>

          <p className="ws-modal-label">How long?</p>
          <div className="ws-modal-days">
            {DURATIONS.map((minutes) => (
              <button key={minutes} type="button" aria-pressed={length === minutes}
                onClick={() => setLength(minutes)}>
                {minutes < 60 ? `${minutes} min` : minutes === 60 ? "1 hour" : `${minutes / 60} hours`}
              </button>
            ))}
          </div>

          {more ? (
            <div className="ev-when-row ev-when-more">
              <input className="ev-when-time" name="location" maxLength={120} placeholder="Dining room"
                aria-label="Location" />
              <select name="track" defaultValue="Program" aria-label="Track" className="ev-when-track">
                {TRACKS.map((track) => <option key={track}>{track}</option>)}
              </select>
            </div>
          ) : (
            <button type="button" className="ws-flag ws-place-toggle" onClick={() => setMore(true)}>
              + More details
            </button>
          )}

          <div className="ws-modal-actions">
            <button type="submit" className="ws-btn" disabled={pending}>
              {pending ? "Adding" : "Add to schedule"}
            </button>
            <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
          </div>
          {message ? <p className="ws-msg" role="status">{message}</p> : null}
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
/**
 * Giving a moment its hour.
 *
 * This one is already part of the weekend; it has simply never had a time.
 * So nothing here creates anything, and nothing is approved. It asks the two
 * things a clock needs and updates the row that already exists.
 */
function GiveTime({
  moment,
  dayName,
  onPlace,
  onClose,
}: {
  moment: Moment;
  dayName: string;
  onPlace: (minutes: number, length: number) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState("");
  const [complaint, setComplaint] = useState<string | null>(null);

  const commit = (length: number) => {
    const parsed = parseTimeLabel(time.trim().toLowerCase());
    if (parsed === null) {
      setComplaint("A time like 10:45 am.");
      return;
    }
    onPlace(parsed, length);
  };

  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true"
      aria-label="Give it a time">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <p className="ev-howlong-title">{moment.title}</p>
        <p className="ev-howlong-when">
          {dayName}
          {moment.daypart ? `, ${moment.daypart}` : ""}
        </p>
        <p className="ev-howlong-note">
          Already part of the weekend. This only gives it an hour.
        </p>

        <label className="ws-modal-label" htmlFor="place-time">What time?</label>
        <input
          id="place-time"
          className="ws-modal-input"
          value={time}
          autoFocus
          placeholder="10:45 am"
          onChange={(event) => { setTime(event.target.value); setComplaint(null); }}
        />
        {complaint ? <p className="ws-msg" role="status">{complaint}</p> : null}

        <p className="ws-modal-label">How long?</p>
        <div className="ws-modal-days">
          {DURATIONS.map((length) => (
            <button key={length} type="button" onClick={() => commit(length)}>
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

/**
 * Putting an idea on the schedule.
 *
 * One sheet for every way in. A dropped idea already landed on an hour, so
 * the only question left is how long. A clicked idea has whatever precision
 * its placement carries and nothing more, so it is asked for a time, and it
 * may honestly answer that there is not one yet: that writes a moment in the
 * right part of the day rather than a moment at an invented hour.
 *
 * Nothing here approves anything. The idea it came from is untouched, and an
 * idea that already has a moment simply gains another.
 */
function AddToSchedule({
  idea,
  dayName,
  minutes,
  blocks,
  onSchedule,
  onInside,
  onOpenEnded,
  onClose,
}: {
  idea: TentativeIdea;
  dayName: string;
  minutes: number | null;
  /** What is already happening that day, so an idea can join one. */
  blocks: Array<{ id: string; label: string }>;
  onSchedule: (minutes: number, length: number) => void;
  onInside: (momentId: string) => void;
  onOpenEnded: () => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState("");
  const [complaint, setComplaint] = useState<string | null>(null);
  /* Dropped on an hour, the answer is already the clock. Clicked, the first
     question is the commoner one: does this belong inside something that is
     already happening? Free time is three hours long and a boat ride is one
     of the things in it, not a separate appointment at 1:15. */
  const [how, setHow] = useState<"inside" | "own">(
    minutes === null && blocks.length > 0 ? "inside" : "own");
  const [inside, setInside] = useState(blocks[0]?.id ?? "");
  /* "Friday morning", not "Friday Morning" and never "8:00 Am". */
  const part = idea.daypart && idea.daypart !== "anytime" ? ` ${idea.daypart}` : "";

  const commit = (length: number) => {
    if (minutes !== null) return onSchedule(minutes, length);
    const parsed = parseTimeLabel(time.trim().toLowerCase());
    if (parsed === null) {
      setComplaint("A time like 10:45 am, or add it without one.");
      return;
    }
    onSchedule(parsed, length);
  };

  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true"
      aria-label="Add to schedule">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <p className="ev-howlong-title">{idea.title}</p>
        <p className="ev-howlong-when">
          {dayName}
          {minutes !== null ? ` · ${fmt(minutes)}` : part}
        </p>
        {idea.scheduled > 0 ? (
          <p className="ev-howlong-note">
            Already happening {idea.scheduled === 1 ? "once" : `${idea.scheduled} times`}. This adds
            another moment and keeps one idea.
          </p>
        ) : null}

        {minutes === null && blocks.length > 0 ? (
          <div className="ev-cue-source" role="group" aria-label="How it happens">
            <button type="button" aria-pressed={how === "inside"} onClick={() => setHow("inside")}>
              Inside something
            </button>
            <button type="button" aria-pressed={how === "own"} onClick={() => setHow("own")}>
              Its own moment
            </button>
          </div>
        ) : null}

        {minutes === null && how === "inside" && blocks.length > 0 ? (
          <>
            <p className="ws-modal-label">Which part of the day?</p>
            <span className="ev-cue-pick">
              <Select label="Which moment" value={inside} onChange={setInside} compact
                options={blocks.map((b) => ({ value: b.id, label: b.label }))} />
            </span>
            <p className="ev-howlong-note">
              It happens inside that block and takes no clock time of its own.
              The idea stays where it is and keeps everything attached to it.
            </p>
            <div className="ws-modal-actions">
              <button type="button" className="ws-btn" disabled={!inside}
                onClick={() => onInside(inside)}>
                Add to that block
              </button>
              <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
        {minutes === null ? (
          <>
            <label className="ws-modal-label" htmlFor="ghost-time">What time?</label>
            <input
              id="ghost-time"
              className="ws-modal-input"
              value={time}
              autoFocus
              placeholder="10:45 am"
              onChange={(event) => { setTime(event.target.value); setComplaint(null); }}
            />
            {complaint ? <p className="ws-msg" role="status">{complaint}</p> : null}
          </>
        ) : null}

        <p className="ws-modal-label">How long?</p>
        <div className="ws-modal-days">
          {DURATIONS.map((length) => (
            <button key={length} type="button" onClick={() => commit(length)}>
              {length < 60 ? `${length} min` : length === 60 ? "1 hour" : `${length / 60} hours`}
            </button>
          ))}
        </div>

        <div className="ws-modal-actions">
          {minutes === null ? (
            <button type="button" className="ws-btn-quiet" onClick={onOpenEnded}>
              Add without a time
            </button>
          ) : null}
          <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
