"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { dayDate } from "@lib/spark/days";
import {
  DAY_LONG,
  DAY_SHORT,
  TEAM_DAYS,
  UNASSIGNED,
  clock,
  dayAgenda,
  guestTitle,
  personalAgenda,
  personalOverlaps,
  rosterOf,
  type Duty,
  type GuideMoment,
  type OpsDetail,
} from "@lib/spark/guide";

import { completeDuty } from "./duty-actions";

/**
 * What the team needs that a guest does not.
 *
 * Three readings of one calendar, from the glance to the job in hand.
 * Schedule is the whole weekend, compact, so anyone can see where the day is.
 * Run of show is the same rows with the execution detail already on the face
 * of them, because mid weekend nobody has a spare hand for tapping. Volunteer
 * duties is the work that is actually assigned, filtered to a name and ticked
 * off as it is finished.
 *
 * Nothing here is a second copy: every row is a schedule_items record. Picking
 * a name filters a list and proves nothing; the server goes by the session,
 * and completing a duty is deliberately not the same permission as editing
 * the weekend.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type TeamStatus = { taskId: string; status: string };

export type TeamProps = {
  route: Route;
  startsOn: string | null;
  moments: GuideMoment[];
  /** Preparation that belongs to no day of the weekend. */
  prep: Duty[];
  /** Completion, by the moment the duty came from. */
  statuses: Record<string, TeamStatus>;
  canEdit: boolean;
  storeKey?: string;
};

type Tab = "schedule" | "ros" | "duties";

const TABS: Array<[Tab, string]> = [
  ["schedule", "Schedule"],
  ["ros", "Run of show"],
  ["duties", "Volunteer duties"],
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
    if (typeof window === "undefined") return "schedule";
    const stored = recall(`${key}:team`);
    return stored === "ros" || stored === "duties" ? stored : "schedule";
  });
  const [day, setDay] = useState<string>(() => {
    if (typeof window === "undefined") return "thu";
    const stored = recall(`${key}:teamday`);
    return stored && (TEAM_DAYS as readonly string[]).includes(stored) ? stored : "thu";
  });

  const shownTab = hydrated ? tab : "schedule";
  /* One day for all three tabs, so switching tab keeps the day you were on. */
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

      {shownTab === "schedule" ? <TeamSchedule {...props} day={shownDay} storeKey={key} /> : null}
      {shownTab === "ros" ? <RunOfShow {...props} day={shownDay} /> : null}
      {shownTab === "duties" ? <Duties {...props} day={shownDay} storeKey={key} /> : null}
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

function Chevron() {
  return (
    <svg className="gd-ros-chev" viewBox="0 0 12 8" aria-hidden="true">
      <path d="M1 1.5l5 5 5-5" />
    </svg>
  );
}

/* The three tabs are three readings of one calendar, split the way the
   weekend actually divides: the programme that happens in front of guests,
   and the work that makes it possible. Schedule is both. */
const isProgram = (moment: GuideMoment) => moment.ops?.category === "program";
const isOperations = (moment: GuideMoment) => moment.ops?.category === "operations";

const span = (moment: GuideMoment) =>
  `${clock(moment.starts)}${moment.ends ? ` to ${clock(moment.ends)}` : ""}`;

/** Names as words: "Lead: Brooke" says more than a coloured pill. */
function Roles({ ops }: { ops: OpsDetail | null | undefined }) {
  if (!ops?.owner && !ops?.support) return null;
  return (
    <span className="gd-roles">
      {ops?.owner ? <span><b>Lead:</b> {ops.owner}</span> : null}
      {ops?.support ? <span><b>Team:</b> {ops.support}</span> : null}
    </span>
  );
}

/**
 * What the source could not settle, said once where the answer is needed.
 *
 * It reads inside an opened row rather than as a badge on every card: the
 * timeline should show the weekend, not a wall of warnings.
 */
function Unresolved({ ops }: { ops: OpsDetail | null | undefined }) {
  if (!ops?.confirm) return null;
  return (
    <p className="gd-unresolved">
      <b>{ops.confirm === "time" ? "Time to confirm." : "Assignment to confirm."}</b>{" "}
      {ops.notes ?? "The master calendar disagrees with itself here."}
    </p>
  );
}

const DETAIL_ROWS: Array<[keyof OpsDetail, string]> = [
  ["purpose", "What happens"],
  ["owner", "Lead"],
  ["support", "Team"],
  ["emcee", "Emcee and transitions"],
  ["location", "Location"],
  ["materials", "Setup"],
  ["next", "Next"],
  ["notes", "Notes"],
];

function Details({ ops, skip = [] }: { ops: OpsDetail | null; skip?: Array<keyof OpsDetail> }) {
  const rows = DETAIL_ROWS.filter(([field]) => ops?.[field] && !skip.includes(field));
  return (
    <>
      <Unresolved ops={ops} />
      {rows.length > 0 ? (
        <dl className="gd-ops">
          {rows.map(([field, label]) => (
            <div key={field}>
              <dt>{label}</dt>
              <dd>{ops![field]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------- schedule */

/**
 * The whole weekend at a glance: when, what, and who has it.
 *
 * Everything, programme and operations together, because this is the tab
 * somebody opens to find out where the day is. Choosing a name narrows it to
 * one person's own thread through the same rows, which is the only way to see
 * a speaking slot and a cleanup in one list.
 */
function TeamSchedule({ moments, day, storeKey }: TeamProps & { day: string; storeKey: string }) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [person, setPerson] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return recall(`${storeKey}:me`);
  });

  const people = rosterOf(moments);
  const shownPerson = hydrated && person && people.includes(person) ? person : null;
  const showMine = hydrated && mine;

  const ofPerson = shownPerson ? personalAgenda(moments, shownPerson) : [];
  const agenda = showMine
    ? ofPerson.filter((entry) => entry.moment.day === day).map((entry) => entry.moment)
    : dayAgenda(moments, day);

  return (
    <>
      <div className="gd-seg gd-seg-two" role="tablist" aria-label="Whose schedule">
        <button type="button" role="tab" aria-selected={!showMine} onClick={() => setMine(false)}>
          Full team
        </button>
        <button type="button" role="tab" aria-selected={showMine} onClick={() => setMine(true)}>
          Your schedule
        </button>
      </div>

      {showMine ? (
        <div className="gd-people-pick">
          <p className="gd-hint">Select your name to see only what you are part of.</p>
          <div className="gd-people">
            {people.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={shownPerson === name}
                onClick={() => {
                  setPerson(name);
                  remember(`${storeKey}:me`, name);
                  setOpenId(null);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showMine && !shownPerson ? <p className="gd-empty">Choose your name to see your schedule.</p> : null}
      <ol className="gd-ros">
        {agenda.map((moment) => {
          const expanded = openId === moment.id;
          return (
            <li key={moment.id} className="gd-ros-item">
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
                  {moment.ops?.owner ? (
                    <span className="gd-roles">
                      <span><b>Lead:</b> {moment.ops.owner}</span>
                    </span>
                  ) : null}
                </span>
                <Chevron />
              </button>
              {expanded ? (
                <div className="gd-ros-body">
                  <Details ops={moment.ops ?? null} />
                  {!moment.teamOnly && guestTitle(moment) !== moment.title ? (
                    <p className="gd-ros-guest">Guests see this as &ldquo;{guestTitle(moment)}&rdquo;.</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {agenda.length === 0 && (!showMine || shownPerson) ? (
        <p className="gd-empty">
          {showMine
            ? `Nothing for ${shownPerson} on ${DAY_LONG[day]}.`
            : `Nothing planned for ${DAY_LONG[day]}.`}
        </p>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------ run of show */

/**
 * The programme, with what it takes to run it already on screen.
 *
 * Only the rows that happen in front of the room: worship, teaching, the
 * illustrations, the handovers. The work around them is the other tab, and
 * anyone who needs both at once has the Schedule.
 */
function RunOfShow({ moments, day }: TeamProps & { day: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const agenda = dayAgenda(moments.filter(isProgram), day);

  return (
    <>
      <ol className="gd-ros gd-ros-full">
        {agenda.map((moment) => {
          const ops = moment.ops;
          const expanded = openId === moment.id;
          const more = Boolean(ops?.notes || ops?.confirm || ops?.location || ops?.emcee);
          return (
            <li key={moment.id} className="gd-ros-item">
              <div className="gd-ros-head gd-ros-static">
                <span className="gd-ros-time">
                  {clock(moment.starts)}
                  {moment.ends ? <i>{clock(moment.ends)}</i> : null}
                </span>
                <span className="gd-ros-main">
                  <span className="gd-ros-title">{moment.title}</span>
                  {ops?.purpose ? <span className="gd-ros-purpose">{ops.purpose}</span> : null}
                  <Roles ops={ops} />
                  {ops?.materials ? (
                    <span className="gd-ros-setup"><b>Setup:</b> {ops.materials}</span>
                  ) : null}
                  {ops?.next ? <span className="gd-ros-setup"><b>Next:</b> {ops.next}</span> : null}
                </span>
              </div>

              {more ? (
                <button
                  type="button"
                  className="gd-more"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : moment.id)}
                >
                  {expanded ? "Less" : "More"}
                  <Chevron />
                </button>
              ) : null}

              {expanded ? (
                <div className="gd-ros-body">
                  <Details ops={ops ?? null} skip={["purpose", "owner", "support", "materials", "next"]} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {agenda.length === 0 ? (
        <p className="gd-empty">No program on {DAY_LONG[day]}.</p>
      ) : null}
    </>
  );
}

/* ----------------------------------------------------------------- duties */

/**
 * Completion, as the person who did the work.
 *
 * Optimistic on screen and checked on the server, which takes a status change
 * from any working member and nothing else from anybody. A volunteer records
 * what they finished without being handed the calendar.
 */
function useCompletion(route: Route) {
  const [local, setLocal] = useState<Map<string, boolean>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const doneOf = (taskId: string, given: string) => local.get(taskId) ?? given === "done";

  const toggle = (taskId: string, given: string, title: string) => {
    const next = !doneOf(taskId, given);
    setLocal((prev) => new Map(prev).set(taskId, next));
    setFailure(null);
    startTransition(async () => {
      const outcome = await completeDuty(
        route.clientSlug, route.eventSlug, route.edition, taskId, next,
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

  return { doneOf, toggle, failure };
}

function DutyCheck({ done, title, onToggle }: { done: boolean; title: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="gd-duty-check"
      aria-pressed={done}
      aria-label={done ? `Mark ${title} not done` : `Mark ${title} done`}
      onClick={onToggle}
    >
      <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.6 2.6L11 4.5" /></svg>
    </button>
  );
}

function Duties({ moments, prep, statuses, route, day, storeKey }: TeamProps & { day: string; storeKey: string }) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [person, setPerson] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return recall(`${storeKey}:me`);
  });
  const { doneOf, toggle, failure } = useCompletion(route);

  /* The operational work, and only that: a job somebody does, with a box to
     tick when it is finished. Being at a meal is not a job, and neither is a
     speaking slot, which belongs to the run of show and to the person's own
     schedule. */
  const duties = moments.filter((moment) => statuses[moment.id] && isOperations(moment));
  const people = rosterOf(duties);
  const shownPerson = hydrated && person && people.includes(person) ? person : null;
  const showMine = hydrated && mine;

  const choose = (name: string) => {
    setPerson(name);
    remember(`${storeKey}:me`, name);
    setOpenId(null);
  };

  const ofPerson = shownPerson
    ? personalAgenda(duties, shownPerson).filter((entry) => entry.involvement !== "team")
    : [];
  const clashes = personalOverlaps(ofPerson);
  const mineToday = ofPerson.filter((entry) => entry.moment.day === day).map((entry) => entry.moment);
  const shown = showMine ? mineToday : dayAgenda(duties, day);
  const titleOf = new Map(duties.map((moment) => [moment.id, moment.title]));

  return (
    <>
      <div className="gd-seg gd-seg-two" role="tablist" aria-label="Whose duties">
        <button type="button" role="tab" aria-selected={!showMine} onClick={() => setMine(false)}>
          All duties
        </button>
        <button type="button" role="tab" aria-selected={showMine} onClick={() => setMine(true)}>
          Your duties
        </button>
      </div>

      {showMine ? (
        <div className="gd-people-pick">
          <p className="gd-hint">Select your name, then check off duties as you finish.</p>
          <div className="gd-people">
            {people.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={shownPerson === name}
                onClick={() => choose(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {failure ? <p className="gd-failure" role="status">{failure}</p> : null}

      {showMine && !shownPerson ? (
        <p className="gd-empty">Choose your name to see your duties.</p>
      ) : (
        <ul className="gd-duties">
          {shown.map((moment) => {
            const record = statuses[moment.id]!;
            const done = doneOf(record.taskId, record.status);
            const expanded = openId === moment.id;
            const against = showMine ? clashes.get(moment.id) ?? [] : [];
            return (
              <li key={moment.id} className={`gd-duty ${done ? "gd-duty-done" : ""}`}>
                <div className="gd-duty-row">
                  <DutyCheck
                    done={done}
                    title={moment.title}
                    onToggle={() => toggle(record.taskId, record.status, moment.title)}
                  />
                  <button
                    type="button"
                    className="gd-duty-body"
                    aria-expanded={expanded}
                    onClick={() => setOpenId(expanded ? null : moment.id)}
                  >
                    <b className="gd-duty-title">{moment.title}</b>
                    <span className="gd-duty-when">{span(moment)}</span>
                    <Roles ops={moment.ops} />
                    {done ? <span className="gd-done">Completed</span> : null}
                  </button>
                  <Chevron />
                </div>

                {against.length > 0 ? (
                  <p className="gd-clash">
                    <b>Overlapping assignments.</b> This runs {span(moment)}, at the same time as{" "}
                    {against.map((id) => titleOf.get(id) ?? "another duty").join(", ")}.
                  </p>
                ) : null}

                {expanded ? (
                  <div className="gd-ros-body">
                    <Details ops={moment.ops ?? null} skip={["owner", "support"]} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {shown.length > 0 || (showMine && !shownPerson) ? null : (
        <p className="gd-empty">
          {showMine ? `Nothing assigned to ${shownPerson} on ${DAY_LONG[day]}.` : `No duties on ${DAY_LONG[day]}.`}
        </p>
      )}

      {!showMine && prep.length > 0 ? (
        <section className="gd-prep">
          <h3>Before the event</h3>
          <p className="gd-hint">Preparation that belongs to no single day.</p>
          <ul>
            {prep.map((duty) => {
              const done = doneOf(duty.id, duty.status);
              return (
                <li key={duty.id} className={`gd-duty ${done ? "gd-duty-done" : ""}`}>
                  <div className="gd-duty-row">
                    <DutyCheck
                      done={done}
                      title={duty.title}
                      onToggle={() => toggle(duty.id, duty.status, duty.title)}
                    />
                    <div className="gd-duty-body">
                      <b className="gd-duty-title">{duty.title}</b>
                      <span className="gd-duty-when">{duty.when ?? "Timing to confirm"}</span>
                      <span className="gd-roles">
                        <span><b>Lead:</b> {duty.owner ?? UNASSIGNED}</span>
                      </span>
                      {duty.notes ? <span className="gd-duty-notes">{duty.notes}</span> : null}
                      {done ? <span className="gd-done">Completed</span> : null}
                    </div>
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
