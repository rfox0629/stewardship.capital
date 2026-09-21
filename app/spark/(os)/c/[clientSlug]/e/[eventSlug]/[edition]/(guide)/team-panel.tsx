"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";

import { dayDate } from "@lib/spark/days";
import {
  DAY_LONG,
  DAY_SHORT,
  PHASE_LABEL,
  TEAM_DAYS,
  UNASSIGNED,
  byPhase,
  clock,
  dayAgenda,
  dutiesFor,
  everyoneIn,
  guestTitle,
  timingConflicts,
  type Duty,
  type GuideMoment,
  type OpenDecision,
  type OpsDetail,
} from "@lib/spark/guide";

import { updateAction } from "../(work)/actions/actions";

/**
 * What the team needs that a guest does not.
 *
 * Two views over things that already exist. The run of show is the calendar,
 * with the setup and cleanup around the guests and how each moment is run;
 * it is not a second calendar, and a time changed in the calendar is changed
 * here. The duties are the volunteer tracker as tasks, so they are ticked off
 * with the same control the rest of the product uses.
 *
 * Picking a name in the duties filter is a filter and nothing more. Nobody is
 * signed in as Keta by tapping Keta.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type TeamProps = {
  base: string;
  route: Route;
  startsOn: string | null;
  moments: GuideMoment[];
  duties: Duty[];
  decisions: OpenDecision[];
  canEdit: boolean;
  storeKey?: string;
};

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const remember = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Nothing to remember with; the filter still works. */
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
  const [view, setView] = useState<"ros" | "duties">(() =>
    typeof window !== "undefined" && recall(`${key}:team`) === "duties" ? "duties" : "ros",
  );
  const shown = hydrated ? view : "ros";

  const choose = (next: "ros" | "duties") => {
    setView(next);
    remember(`${key}:team`, next);
  };

  return (
    <section className="gd-shell gd-page gd-team" aria-label="Team">
      <div className="gd-team-head">
        <h2 className="gd-pagehead">Team</h2>
        {props.canEdit ? (
          <Link className="gd-team-edit" href={`${props.base}/schedule`}>Open the calendar to edit</Link>
        ) : null}
      </div>

      <div className="gd-seg" role="tablist" aria-label="Team view">
        <button type="button" role="tab" aria-selected={shown === "ros"} onClick={() => choose("ros")}>
          Run of show
        </button>
        <button type="button" role="tab" aria-selected={shown === "duties"} onClick={() => choose("duties")}>
          Volunteer duties
        </button>
      </div>

      {shown === "ros" ? <RunOfShow {...props} storeKey={key} /> : <Duties {...props} storeKey={key} />}
    </section>
  );
}

/* ------------------------------------------------------------ run of show */

function RunOfShow({ base, startsOn, moments, duties, canEdit, storeKey }: TeamProps & { storeKey: string }) {
  const hydrated = useHydrated();
  const [day, setDay] = useState<string>(() => {
    if (typeof window === "undefined") return "thu";
    const stored = recall(`${storeKey}:rosday`);
    return stored && (TEAM_DAYS as readonly string[]).includes(stored) ? stored : "thu";
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const shownDay = hydrated ? day : "thu";

  const conflicts = timingConflicts(moments);
  const titleOf = new Map(moments.map((moment) => [moment.id, moment.title]));
  const agenda = dayAgenda(moments, shownDay);

  return (
    <>
      <div className="gd-days gd-days-team" role="tablist" aria-label="Day">
        <div className="gd-days-inner">
          {TEAM_DAYS.map((key) => {
            const date = dayDate(startsOn, key);
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={shownDay === key}
                className="gd-day"
                onClick={() => { setDay(key); remember(`${storeKey}:rosday`, key); }}
              >
                <b>{DAY_SHORT[key]}</b>
                {date ? <span>{date.getUTCDate()}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <ol className="gd-ros">
        {agenda.map((moment) => {
          const clashes = conflicts.get(moment.id) ?? [];
          const linked = duties.filter((duty) => duty.momentId === moment.id);
          const expanded = openId === moment.id;
          const needsOwner = moment.ops?.status?.toLowerCase().includes("needs owner");
          return (
            <li key={moment.id} className={`gd-ros-item ${moment.teamOnly ? "gd-ros-team" : ""} ${moment.window ? "gd-ros-window" : ""}`}>
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
                    {moment.teamOnly ? <em className="gd-tag gd-tag-team">Team only</em> : null}
                    {moment.window ? <em className="gd-tag">Window</em> : null}
                    {needsOwner ? <em className="gd-tag gd-tag-warn">Needs owner</em> : null}
                    {clashes.length > 0 ? <em className="gd-tag gd-tag-warn">Time overlap</em> : null}
                  </span>
                  {moment.ops?.owner ? <span className="gd-ros-owner">{moment.ops.owner}</span> : null}
                </span>
                <svg className="gd-ros-chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" /></svg>
              </button>

              {expanded ? (
                <div className="gd-ros-body">
                  {clashes.length > 0 ? (
                    <p className="gd-ros-clash">
                      Overlaps {clashes.map((id) => titleOf.get(id)).filter(Boolean).join(", ")}.
                    </p>
                  ) : null}
                  <OpsList ops={moment.ops ?? null} />
                  {!moment.teamOnly && guestTitle(moment) !== moment.title ? (
                    <p className="gd-ros-guest">Guests see this as &ldquo;{guestTitle(moment)}&rdquo;.</p>
                  ) : null}
                  {linked.length > 0 ? (
                    <div className="gd-ros-duties">
                      <h4>Duties tied to this</h4>
                      <ul>
                        {linked.map((duty) => (
                          <li key={duty.id}>
                            <b>{duty.title}</b>
                            <span>{duty.owner ?? UNASSIGNED}{duty.when ? ` · ${duty.when}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {canEdit ? (
                    <Link className="gd-link" href={`${base}/schedule?day=${moment.day}&open=${moment.id}`}>
                      Change the time in the calendar
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {agenda.length === 0 ? <p className="gd-empty">Nothing planned for {DAY_LONG[shownDay]}.</p> : null}
    </>
  );
}

const OPS_ROWS: Array<[keyof OpsDetail, string]> = [
  ["purpose", "Purpose"],
  ["owner", "Program owner"],
  ["emcee", "Emcee and transitions"],
  ["support", "Volunteer support"],
  ["location", "Location"],
  ["materials", "Materials and setup"],
  ["next", "Next cue"],
  ["notes", "Notes"],
  ["status", "Status"],
];

function OpsList({ ops }: { ops: OpsDetail | null }) {
  if (!ops) return <p className="gd-empty">No run of show detail yet.</p>;
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

function Duties({ route, moments, duties, decisions, canEdit, storeKey }: TeamProps & { storeKey: string }) {
  const hydrated = useHydrated();
  const people = everyoneIn(duties);
  const [person, setPerson] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = recall(`${storeKey}:person`);
    return stored && people.includes(stored) ? stored : null;
  });
  const shownPerson = hydrated ? person : null;
  const [local, setLocal] = useState<Map<string, string>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const [showDecisions, setShowDecisions] = useState(false);
  const [, startTransition] = useTransition();

  const momentOf = new Map(moments.map((moment) => [moment.id, moment]));
  const statusOf = (duty: Duty) => local.get(duty.id) ?? duty.status;
  const groups = byPhase(dutiesFor(duties, shownPerson));

  const choose = (next: string | null) => {
    setPerson(next);
    remember(`${storeKey}:person`, next ?? "");
  };

  /* The existing completion control, planner only, checked on the server. */
  const toggle = (duty: Duty) => {
    const next = statusOf(duty) === "done" ? "todo" : "done";
    setLocal((prev) => new Map(prev).set(duty.id, next));
    setFailure(null);
    startTransition(async () => {
      const outcome = await updateAction(route.clientSlug, route.eventSlug, route.edition, duty.id, { status: next });
      if (!outcome.ok) {
        setLocal((prev) => {
          const map = new Map(prev);
          map.delete(duty.id);
          return map;
        });
        setFailure("That did not save, so it is unchanged.");
      }
    });
  };

  return (
    <>
      <div className="gd-people" role="group" aria-label="Show duties for">
        <button type="button" aria-pressed={shownPerson === null} onClick={() => choose(null)}>Everyone</button>
        {people.map((name) => (
          <button key={name} type="button" aria-pressed={shownPerson === name} onClick={() => choose(name)}>
            {name}
          </button>
        ))}
      </div>
      <p className="gd-hint">Choosing a name only filters the list.</p>

      {decisions.length > 0 ? (
        <div className="gd-decisions">
          <button
            type="button"
            className="gd-decisions-head"
            aria-expanded={showDecisions}
            onClick={() => setShowDecisions((open) => !open)}
          >
            <b>Still to decide</b>
            <span>{decisions.length}</span>
            <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" /></svg>
          </button>
          {showDecisions ? (
            <ul>
              {decisions.map((decision) => (
                <li key={decision.id}>
                  <b>{decision.question}</b>
                  {decision.context ? <span>{decision.context}</span> : null}
                  {decision.owner ? <em>{decision.owner}</em> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {failure ? <p className="gd-failure" role="status">{failure}</p> : null}

      {groups.map((group) => (
        <section key={group.phase} className="gd-dutygroup">
          <h3>{PHASE_LABEL[group.phase] ?? group.phase}</h3>
          <ul>
            {group.duties.map((duty) => {
              const status = statusOf(duty);
              const moment = duty.momentId ? momentOf.get(duty.momentId) : undefined;
              return (
                <li key={duty.id} className={`gd-duty gd-duty-${status}`}>
                  {canEdit ? (
                    <button
                      type="button"
                      className="gd-duty-check"
                      aria-pressed={status === "done"}
                      aria-label={status === "done" ? `Mark ${duty.title} not done` : `Mark ${duty.title} done`}
                      onClick={() => toggle(duty)}
                    >
                      <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.6 2.6L11 4.5" /></svg>
                    </button>
                  ) : null}
                  <div className="gd-duty-body">
                    <b className="gd-duty-title">{duty.title}</b>
                    <span className="gd-duty-who">{duty.owner ?? UNASSIGNED}</span>
                    <span className="gd-duty-when">
                      {duty.when ?? "Timing to confirm"}
                      {moment?.location ? ` · ${moment.location}` : ""}
                      {moment ? ` · ${guestTitle(moment)} ${clock(moment.starts)}` : ""}
                    </span>
                    {duty.notes ? <span className="gd-duty-notes">{duty.notes}</span> : null}
                  </div>
                  <em className={`gd-duty-status gd-status-${status}`}>{STATUS_LABEL[status] ?? status}</em>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {groups.length === 0 ? <p className="gd-empty">No duties for {shownPerson}.</p> : null}
    </>
  );
}
