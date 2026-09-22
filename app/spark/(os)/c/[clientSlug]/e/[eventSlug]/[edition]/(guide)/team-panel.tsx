"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { dayDate } from "@lib/spark/days";
import {
  DAY_LONG,
  DAY_SHORT,
  TEAM_DAYS,
  UNASSIGNED,
  categoryOf,
  clock,
  dayAgenda,
  guestTitle,
  INVOLVEMENT_LABEL,
  personalAgenda,
  personalOverlaps,
  rosterOf,
  type Duty,
  type GuideMoment,
  type OpsDetail,
} from "@lib/spark/guide";

import { updateAction } from "../(work)/actions/actions";

/**
 * What the team needs that a guest does not.
 *
 * Three readings of one calendar. The run of show is the whole day, program
 * and operations side by side, because work that happens at the same time has
 * to look like it does. The duties are the operations rows, ticked off with
 * the control the rest of the product uses. My schedule is one person's own
 * thread through both, so nobody reads the duty list and misses that they are
 * also speaking at ten.
 *
 * Nothing here is a second copy: every row is a schedule_items record, so a
 * time changed in the calendar is changed in all of them at once. Choosing a
 * name is a filter. It signs nobody in as anybody.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type TeamStatus = { taskId: string; status: string };

export type TeamProps = {
  route: Route;
  startsOn: string | null;
  moments: GuideMoment[];
  /** Tasks that belong to no day, kept apart from the weekend itself. */
  prep: Duty[];
  /** Completion, by the moment the duty came from. */
  statuses: Record<string, TeamStatus>;
  canEdit: boolean;
  storeKey?: string;
};

type Tab = "ros" | "duties" | "mine";

const TABS: Array<[Tab, string]> = [
  ["ros", "Run of show"],
  ["duties", "Volunteer duties"],
  ["mine", "My schedule"],
];

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const remember = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Nothing to remember with; everything still works. */
  }
};
const recall = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function TeamPanel(props: TeamProps) {
  const key = props.storeKey ?? "gd";
  const hydrated = useHydrated();

  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "ros";
    const stored = recall(`${key}:team`);
    return stored === "duties" || stored === "mine" ? stored : "ros";
  });
  const [day, setDay] = useState<string>(() => {
    if (typeof window === "undefined") return "thu";
    const stored = recall(`${key}:teamday`);
    return stored && (TEAM_DAYS as readonly string[]).includes(stored) ? stored : "thu";
  });

  const shownTab = hydrated ? tab : "ros";
  const shownDay = hydrated ? day : "thu";

  const chooseTab = (next: Tab) => {
    setTab(next);
    remember(`${key}:team`, next);
  };
  const chooseDay = (next: string) => {
    setDay(next);
    remember(`${key}:teamday`, next);
  };

  return (
    <section className="gd-shell gd-page gd-team" aria-label="Team">
      <h2 className="gd-pagehead">Team</h2>

      <div className="gd-seg gd-seg-three" role="tablist" aria-label="Team view">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={shownTab === value}
            onClick={() => chooseTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <DaySelector startsOn={props.startsOn} day={shownDay} onDay={chooseDay} />

      {shownTab === "ros" ? <RunOfShow {...props} day={shownDay} /> : null}
      {shownTab === "duties" ? <Duties {...props} day={shownDay} storeKey={key} /> : null}
      {shownTab === "mine" ? (
        <MySchedule {...props} day={shownDay} storeKey={key} onFullTimeline={() => chooseTab("ros")} />
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------- the same days */

function DaySelector({
  startsOn,
  day,
  onDay,
}: {
  startsOn: string | null;
  day: string;
  onDay: (day: string) => void;
}) {
  return (
    <div className="gd-days gd-days-team" role="tablist" aria-label="Day">
      <div className="gd-days-inner">
        {TEAM_DAYS.map((key) => {
          const date = dayDate(startsOn, key);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={day === key}
              className="gd-day"
              onClick={() => onDay(key)}
            >
              <b>{DAY_SHORT[key]}</b>
              {date ? <span>{date.getUTCDate()}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Program or Operations, said in words as well as in colour. */
function CategoryBadge({ moment }: { moment: GuideMoment }) {
  const category = categoryOf(moment);
  return (
    <em className={`gd-badge gd-badge-${category}`}>
      {category === "program" ? "Program" : "Operations"}
    </em>
  );
}

function ConfirmBadge({ ops }: { ops: OpsDetail | null | undefined }) {
  if (!ops?.confirm) return null;
  return (
    <em className="gd-badge gd-badge-confirm">
      {ops.confirm === "time" ? "Time to confirm" : "Assignment to confirm"}
    </em>
  );
}

/** Lead first, then the people the row is assigned to. */
function Who({ ops }: { ops: OpsDetail | null | undefined }) {
  if (!ops?.owner && !ops?.support) return null;
  return (
    <span className="gd-ros-owner">
      {ops?.owner ? <b>{ops.owner}</b> : null}
      {ops?.support ? <span>{ops.support}</span> : null}
    </span>
  );
}

function Chevron() {
  return (
    <svg className="gd-ros-chev" viewBox="0 0 12 8" aria-hidden="true">
      <path d="M1 1.5l5 5 5-5" />
    </svg>
  );
}

/* ------------------------------------------------------------ run of show */

function RunOfShow({ moments, day, statuses }: TeamProps & { day: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const agenda = dayAgenda(moments, day);

  return (
    <>
      <ol className="gd-ros">
        {agenda.map((moment) => {
          const expanded = openId === moment.id;
          const done = statuses[moment.id]?.status === "done";
          return (
            <li
              key={moment.id}
              className={`gd-ros-item gd-cat-${categoryOf(moment)} ${moment.teamOnly ? "gd-ros-team" : ""}`}
            >
              <button
                type="button"
                className="gd-ros-head"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : moment.id)}
              >
                <span className="gd-ros-time">
                  {clock(moment.starts)}
                  {moment.ends ? <i>{clock(moment.ends)}</i> : null}
                </span>
                <span className="gd-ros-main">
                  <span className="gd-ros-title">{moment.title}</span>
                  <span className="gd-ros-tags">
                    <CategoryBadge moment={moment} />
                    {moment.teamOnly ? <em className="gd-badge gd-badge-team">Team only</em> : null}
                    <ConfirmBadge ops={moment.ops} />
                    {done ? <em className="gd-badge gd-badge-done">Done</em> : null}
                  </span>
                  <Who ops={moment.ops} />
                </span>
                <Chevron />
              </button>

              {expanded ? (
                <div className="gd-ros-body">
                  <OpsList ops={moment.ops ?? null} />
                  {!moment.teamOnly && guestTitle(moment) !== moment.title ? (
                    <p className="gd-ros-guest">Guests see this as &ldquo;{guestTitle(moment)}&rdquo;.</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {agenda.length === 0 ? <p className="gd-empty">Nothing planned for {DAY_LONG[day]}.</p> : null}
    </>
  );
}

const OPS_ROWS: Array<[keyof OpsDetail, string]> = [
  ["purpose", "What happens"],
  ["owner", "Lead"],
  ["support", "Assigned team"],
  ["emcee", "Emcee and transitions"],
  ["location", "Location"],
  ["materials", "Setup and notes"],
  ["next", "Next cue"],
  ["notes", "Notes"],
  ["status", "Status"],
];

function OpsList({ ops }: { ops: OpsDetail | null }) {
  if (!ops) return <p className="gd-empty">No detail on this row yet.</p>;
  return (
    <dl className="gd-ops">
      {OPS_ROWS.filter(([field]) => ops[field]).map(([field, label]) => (
        <div key={field}>
          <dt>{label}</dt>
          <dd>{ops[field]}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------- duties */

const STATUS_LABEL: Record<string, string> = {
  todo: "Not started",
  doing: "In progress",
  blocked: "Needs decision",
  done: "Done",
};

/** The completion control, planner only, checked again on the server. */
function useCompletion(route: Route) {
  const [local, setLocal] = useState<Map<string, string>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const statusOf = (taskId: string, given: string) => local.get(taskId) ?? given;

  const toggle = (taskId: string, given: string, title: string) => {
    const next = statusOf(taskId, given) === "done" ? "todo" : "done";
    setLocal((prev) => new Map(prev).set(taskId, next));
    setFailure(null);
    startTransition(async () => {
      const outcome = await updateAction(
        route.clientSlug, route.eventSlug, route.edition, taskId, { status: next },
      );
      if (!outcome.ok) {
        setLocal((prev) => {
          const map = new Map(prev);
          map.delete(taskId);
          return map;
        });
        setFailure(`${title} did not save, so it is unchanged.`);
      }
    });
  };

  return { statusOf, toggle, failure };
}

function Duties({ moments, prep, statuses, canEdit, route, day }: TeamProps & { day: string; storeKey: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { statusOf, toggle, failure } = useCompletion(route);

  const duties = dayAgenda(moments, day).filter((moment) => statuses[moment.id]);

  return (
    <>
      {failure ? <p className="gd-failure" role="status">{failure}</p> : null}

      <ul className="gd-duties">
        {duties.map((moment) => {
          const record = statuses[moment.id]!;
          const status = statusOf(record.taskId, record.status);
          const expanded = openId === moment.id;
          return (
            <li key={moment.id} className={`gd-duty gd-duty-${status}`}>
              <div className="gd-duty-row">
                {canEdit ? (
                  <button
                    type="button"
                    className="gd-duty-check"
                    aria-pressed={status === "done"}
                    aria-label={status === "done" ? `Mark ${moment.title} not done` : `Mark ${moment.title} done`}
                    onClick={() => toggle(record.taskId, record.status, moment.title)}
                  >
                    <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.6 2.6L11 4.5" /></svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="gd-duty-body"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : moment.id)}
                >
                  <b className="gd-duty-title">{moment.title}</b>
                  <span className="gd-duty-when">
                    {clock(moment.starts)}
                    {moment.ends ? ` to ${clock(moment.ends)}` : ""}
                  </span>
                  <Who ops={moment.ops} />
                  <span className="gd-ros-tags">
                    <ConfirmBadge ops={moment.ops} />
                    <em className={`gd-badge gd-status-${status}`}>{STATUS_LABEL[status] ?? status}</em>
                  </span>
                </button>
                <Chevron />
              </div>
              {expanded ? (
                <div className="gd-ros-body">
                  <OpsList ops={moment.ops ?? null} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {duties.length === 0 ? <p className="gd-empty">No duties on {DAY_LONG[day]}.</p> : null}

      {prep.length > 0 ? (
        <section className="gd-prep">
          <h3>Before the event</h3>
          <p className="gd-hint">Preparation that belongs to no single day.</p>
          <ul>
            {prep.map((duty) => {
              const status = statusOf(duty.id, duty.status);
              return (
                <li key={duty.id} className={`gd-duty gd-duty-${status}`}>
                  <div className="gd-duty-row">
                    {canEdit ? (
                      <button
                        type="button"
                        className="gd-duty-check"
                        aria-pressed={status === "done"}
                        aria-label={status === "done" ? `Mark ${duty.title} not done` : `Mark ${duty.title} done`}
                        onClick={() => toggle(duty.id, duty.status, duty.title)}
                      >
                        <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.6 2.6L11 4.5" /></svg>
                      </button>
                    ) : null}
                    <div className="gd-duty-body">
                      <b className="gd-duty-title">{duty.title}</b>
                      <span className="gd-duty-when">{duty.when ?? "Timing to confirm"}</span>
                      <span className="gd-ros-owner"><b>{duty.owner ?? UNASSIGNED}</b></span>
                      {duty.notes ? <span className="gd-duty-notes">{duty.notes}</span> : null}
                    </div>
                    <em className={`gd-badge gd-status-${status}`}>{STATUS_LABEL[status] ?? status}</em>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------ my schedule */

function MySchedule({
  moments,
  day,
  storeKey,
  onFullTimeline,
}: TeamProps & { day: string; storeKey: string; onFullTimeline: () => void }) {
  const hydrated = useHydrated();
  const people = rosterOf(moments);
  const [person, setPerson] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = recall(`${storeKey}:me`);
    return stored && stored.length > 0 ? stored : null;
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const shownPerson = hydrated && person && people.includes(person) ? person : null;

  const choose = (next: string) => {
    setPerson(next);
    remember(`${storeKey}:me`, next);
    setOpenId(null);
  };

  if (!shownPerson) {
    return (
      <div className="gd-pick">
        <h3>Choose your name</h3>
        <p className="gd-hint">
          Your own list of everything you lead, support and are assigned to.
        </p>
        <div className="gd-people">
          {people.map((name) => (
            <button key={name} type="button" onClick={() => choose(name)}>{name}</button>
          ))}
        </div>
      </div>
    );
  }

  const everything = personalAgenda(moments, shownPerson);
  const clashes = personalOverlaps(everything);
  const today = everything.filter((entry) => entry.moment.day === day);
  const titleOf = new Map(moments.map((moment) => [moment.id, moment.title]));
  const timeOf = new Map(
    moments.map((moment) => [
      moment.id,
      `${clock(moment.starts)}${moment.ends ? ` to ${clock(moment.ends)}` : ""}`,
    ]),
  );

  return (
    <>
      <div className="gd-mine-head">
        <div>
          <h3>{shownPerson}</h3>
          <p className="gd-hint">{DAY_LONG[day]}. Choosing a name changes nothing but this list.</p>
        </div>
        <div className="gd-mine-actions">
          <button type="button" className="gd-link" onClick={() => setPerson(null)}>
            Someone else
          </button>
          <button type="button" className="gd-link" onClick={onFullTimeline}>
            Full team timeline
          </button>
        </div>
      </div>

      <ol className="gd-ros gd-mine">
        {today.map((entry) => {
          const moment = entry.moment;
          const expanded = openId === moment.id;
          const against = clashes.get(moment.id) ?? [];
          return (
            <li key={moment.id} className={`gd-ros-item gd-cat-${categoryOf(moment)}`}>
              <button
                type="button"
                className="gd-ros-head"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : moment.id)}
              >
                <span className="gd-ros-time">
                  {clock(moment.starts)}
                  {moment.ends ? <i>{clock(moment.ends)}</i> : null}
                </span>
                <span className="gd-ros-main">
                  <span className="gd-ros-title">{moment.title}</span>
                  <span className="gd-ros-tags">
                    <em className={`gd-badge gd-badge-${entry.involvement}`}>
                      {INVOLVEMENT_LABEL[entry.involvement]}
                    </em>
                    <CategoryBadge moment={moment} />
                    <ConfirmBadge ops={moment.ops} />
                    {against.length > 0 ? (
                      <em className="gd-badge gd-badge-clash">Overlapping assignments</em>
                    ) : null}
                  </span>
                  {entry.because ? <span className="gd-ros-owner"><span>{entry.because}</span></span> : null}
                </span>
                <Chevron />
              </button>

              {against.length > 0 ? (
                <p className="gd-clash">
                  <b>Overlapping assignments.</b> This runs {timeOf.get(moment.id)}, at the same time as{" "}
                  {against
                    .map((id) => `${titleOf.get(id) ?? "another row"} (${timeOf.get(id) ?? ""})`)
                    .join(", ")}
                  . Both are listed as yours.
                </p>
              ) : null}

              {expanded ? (
                <div className="gd-ros-body">
                  <OpsList ops={moment.ops ?? null} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {today.length === 0 ? (
        <p className="gd-empty">Nothing assigned to {shownPerson} on {DAY_LONG[day]}.</p>
      ) : null}
    </>
  );
}
