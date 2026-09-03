"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Select } from "@spark/_components/select";
import {
  addIdeaAction, addIdeaCost, addIdeaNote, addIdeaRequirement, answerIdeaQuestion,
  deleteIdea, describeIdea, placeIdea, placeIdeaInMoment, renameIdea, scheduleIdea,
  setIdeaQuestion, setIdeaState,
} from "./actions";
import type { Idea } from "./board";

/**
 * One idea, opening outward.
 *
 * At rest it is a title, where it might fit, a description and four ways to
 * make it real. Everything else appears only once it exists: an idea with no
 * actions shows no actions section, and an idea with no notes shows a single
 * line rather than an empty form. The panel grows with the idea instead of
 * presenting the whole data model on arrival.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };
type Sheet = "schedule" | "action" | "cost" | "requirement" | "note" | null;

/* Rough placement, editable from the idea. Unplaced and event-wide are
   different answers, so they are different options. */
const PLACEMENTS = [
  { value: "", label: "Unplaced" },
  { value: "all", label: "Event-wide" },
  { value: "wed", label: "Wednesday" }, { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" }, { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

/* Scheduling asks for a real day, so event-wide and unplaced are not offered. */
const DAYS = [
  { value: "wed", label: "Wednesday" }, { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" }, { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];
const DAYPARTS = [
  { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" }, { value: "anytime", label: "Anytime" },
];
const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"]
  .map((t) => ({ value: t, label: t }));
const KINDS = [
  { value: "person", label: "Person" }, { value: "vendor", label: "Vendor" },
  { value: "equipment", label: "Equipment" }, { value: "supply", label: "Supply" },
  { value: "deliverable", label: "Deliverable" },
];

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

export function IdeaPanel({
  idea, route, planner, moments, onClose, onDeleted,
}: {
  idea: Idea;
  route: Route;
  planner: boolean;
  moments: Array<{ id: string; label: string }>;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [answering, setAnswering] = useState(false);
  const [asking, setAsking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [, startTransition] = useTransition();

  const r = [route.clientSlug, route.eventSlug, route.edition] as const;
  const inThePlan =
    idea.schedule.length > 0 || idea.inMoments.length > 0 || idea.actions.length > 0 ||
    idea.requirements.length > 0 || idea.costs.length > 0;
  const costTotal = idea.costs.reduce((sum, cost) => sum + cost.cents, 0);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const outcome = await fn();
      if (outcome.ok) { setSheet(null); setAnswering(false); setAsking(false); setFailed(null); }
      else setFailed(outcome.message ?? "That did not save.");
    });

  return (
    <div className="ws-panel-wrap" role="dialog" aria-modal="true" aria-label={idea.title}>
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-panel ws-panel-wide">
        <header className="ws-panel-head">
          <div className="ws-head-left">
            {planner ? (
              <div className="ws-daychip">
                <Select label="Where it might fit" compact
                  value={idea.day ?? ""}
                  options={PLACEMENTS}
                  onChange={(value) =>
                    startTransition(async () => {
                      await placeIdea(...r, idea.id, value || null, value ? idea.daypart : null);
                    })} />
              </div>
            ) : idea.day ? (
              <span className="ws-chip ws-chip-day">{idea.day}</span>
            ) : null}
          </div>
          <div className="ws-head-right">
            {planner ? (
              <div className="ws-menu">
                <button type="button" className="ws-menu-btn" aria-label="More"
                  aria-expanded={menu} onClick={() => setMenu((v) => !v)}>•••</button>
                {menu ? (
                  <div className="ws-menu-list" role="menu">
                    <button type="button" role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        startTransition(async () => {
                          await setIdeaState(...r, idea.id, idea.state === "aside" ? "open" : "aside");
                        });
                      }}>
                      {idea.state === "aside" ? "Bring back" : "Set aside"}
                    </button>
                    <button type="button" role="menuitem" className="ws-menu-danger"
                      onClick={() => { setMenu(false); setConfirming(true); }}>
                      Delete idea
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <button type="button" className="ws-x" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="ws-panel-body">
          {planner ? (
            <input className="ws-title-edit" defaultValue={idea.title} maxLength={200} aria-label="Idea"
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              onBlur={(event) => {
                const title = event.target.value;
                if (title.trim() && title.trim() !== idea.title) {
                  startTransition(async () => { await renameIdea(...r, idea.id, title); });
                }
              }} />
          ) : (
            <h3 className="ws-panel-title">{idea.title}</h3>
          )}

          {planner ? (
            <textarea className="ws-detail" defaultValue={idea.detail ?? ""} rows={2} maxLength={1000}
              placeholder="Add a description…" aria-label="Description"
              onBlur={(event) => {
                if ((idea.detail ?? "") !== event.target.value) {
                  const detail = event.target.value;
                  startTransition(async () => { await describeIdea(...r, idea.id, detail); });
                }
              }} />
          ) : idea.detail ? <p className="ws-note">{idea.detail}</p> : null}

          {/* ------------------------------------------- question and answer */}
          {idea.question ? (
            <div className="ws-question">
              <p className="ws-question-label">Open question</p>
              <p className="ws-question-text">{idea.question}</p>
              {planner ? (
                answering ? (
                  <form className="ws-answer-form"
                    action={(f) => run(() => answerIdeaQuestion(...r, idea.id, String(f.get("a") ?? "")))}>
                    <input name="a" placeholder="What did we decide?" maxLength={400} autoFocus aria-label="Answer" />
                    <button type="submit" className="ws-btn">Save</button>
                  </form>
                ) : (
                  <div className="ws-answer-row">
                    <button type="button" className="ws-ans-yes"
                      onClick={() => run(() => answerIdeaQuestion(...r, idea.id, "Yes"))}>Yes</button>
                    <button type="button" className="ws-ans-no"
                      onClick={() => run(() => answerIdeaQuestion(...r, idea.id, "No"))}>No</button>
                    <button type="button" className="ws-btn-quiet" onClick={() => setAnswering(true)}>
                      Answer…
                    </button>
                  </div>
                )
              ) : null}
            </div>
          ) : idea.answer ? (
            <div className="ws-decided">
              <p className="ws-decided-label">Decision</p>
              <p className="ws-decided-text">✓ {idea.answer}</p>
            </div>
          ) : null}

          {/* ----------------------------------------------- make it real */}
          {planner ? (
            <div className="ws-real">
              <p className="ws-real-head">Make it real</p>
              <div className="ws-quick-row">
                <button type="button" className={`ws-quick-btn ${sheet === "schedule" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "schedule" ? null : "schedule")}>+ Add to schedule</button>
                <button type="button" className={`ws-quick-btn ${sheet === "action" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "action" ? null : "action")}>+ Add action</button>
                <button type="button" className={`ws-quick-btn ${sheet === "cost" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "cost" ? null : "cost")}>+ Add cost</button>
                <button type="button" className={`ws-quick-btn ${sheet === "requirement" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "requirement" ? null : "requirement")}>+ Add requirement</button>
              </div>

              {sheet === "schedule" ? (
                <ScheduleSheet route={route} idea={idea} moments={moments} onRun={run} />
              ) : null}

              {sheet === "action" ? (
                <form className="ws-quick-form" action={(f) => run(() => addIdeaAction(...r, idea.id, {
                  title: String(f.get("title") ?? ""), owner: String(f.get("owner") ?? ""), due: String(f.get("due") ?? ""),
                }))}>
                  <input name="title" placeholder="What needs doing" maxLength={200} autoFocus aria-label="Action" />
                  <input name="owner" placeholder="Owner" maxLength={80} aria-label="Owner" />
                  <input name="due" type="date" aria-label="Due" />
                  <button type="submit" className="ws-btn">Add</button>
                </form>
              ) : null}

              {sheet === "cost" ? (
                <form className="ws-quick-form" action={(f) => run(() => addIdeaCost(...r, idea.id, {
                  label: String(f.get("label") ?? ""), dollars: String(f.get("dollars") ?? ""),
                }))}>
                  <input name="label" placeholder="What for" maxLength={200} autoFocus aria-label="Cost" />
                  <span className="ws-quick-prefix">$</span>
                  <input name="dollars" inputMode="decimal" placeholder="0" aria-label="Amount" />
                  <button type="submit" className="ws-btn">Add</button>
                </form>
              ) : null}

              {sheet === "requirement" ? (
                <RequirementSheet route={route} ideaId={idea.id} onRun={run} />
              ) : null}

              {failed ? <p className="ws-msg" role="status">{failed}</p> : null}
            </div>
          ) : null}

          {/* ------------------- only what exists, in the order it matters */}
          {idea.schedule.length > 0 || idea.inMoments.length > 0 ? (
            <div className="ws-real-block">
              {idea.schedule.map((row) => (
                <Link key={row.id} className="ws-real-line ws-real-when" href={row.href}>
                  <b>✓ Scheduled</b> {row.label}
                </Link>
              ))}
              {idea.inMoments.map((row) => (
                <Link key={row.id} className="ws-real-line ws-real-when" href={row.href}>
                  <b>✓ In run of show</b> {row.label}
                </Link>
              ))}
            </div>
          ) : null}

          {idea.actions.length > 0 ? (
            <div className="ws-real-block">
              <p className="ws-sub-head">Actions · {idea.actions.length}</p>
              {idea.actions.map((row) => (
                <p key={row.id} className="ws-noteline">{row.title}<span>{row.sub || "Unassigned"}</span></p>
              ))}
            </div>
          ) : null}

          {idea.requirements.length > 0 ? (
            <div className="ws-real-block">
              <p className="ws-sub-head">Requirements · {idea.requirements.length}</p>
              {idea.requirements.map((row) => (
                <p key={row.id} className="ws-noteline">{row.name}<span>{row.sub}</span></p>
              ))}
            </div>
          ) : null}

          {idea.costs.length > 0 ? (
            <div className="ws-real-block">
              <p className="ws-sub-head">Cost · {money(costTotal)}</p>
              {idea.costs.map((row) => (
                <p key={row.id} className="ws-costline">{row.label}<b>{money(row.cents)}</b></p>
              ))}
            </div>
          ) : null}

          {/* ------------------------------------------------ quiet notes */}
          <div className="ws-real-block ws-quiet-block">
            {idea.notes.length > 0 && !showNotes ? (
              <button type="button" className="ws-flag" onClick={() => setShowNotes(true)}>
                Notes · {idea.notes.length}
              </button>
            ) : null}
            {showNotes || idea.notes.length === 0 ? (
              <>
                {idea.notes.map((entry, index) => (
                  <p key={index} className="ws-noteline">
                    {entry.body}<span>{entry.author ?? ""} · {entry.at}</span>
                  </p>
                ))}
                {sheet === "note" ? (
                  <form className="ws-quick-form"
                    action={(f) => run(() => addIdeaNote(...r, idea.id, String(f.get("body") ?? "")))}>
                    <input name="body" maxLength={1000} placeholder="Add a note" autoFocus aria-label="Note" />
                    <button type="submit" className="ws-btn">Add</button>
                  </form>
                ) : (
                  <button type="button" className="ws-flag" onClick={() => setSheet("note")}>+ Add note</button>
                )}
              </>
            ) : null}
            {planner && !idea.question && !idea.answer ? (
              asking ? (
                <form className="ws-quick-form"
                  action={(f) => run(() => setIdeaQuestion(...r, idea.id, String(f.get("q") ?? "")))}>
                  <input name="q" placeholder="What is unresolved?" maxLength={400} autoFocus aria-label="Question" />
                  <button type="submit" className="ws-btn">Flag</button>
                </form>
              ) : (
                <button type="button" className="ws-flag" onClick={() => setAsking(true)}>+ Flag a question</button>
              )
            ) : null}
          </div>

          {confirming ? (
            <div className="ws-real-block ws-danger">
              {inThePlan ? (
                <>
                  <p className="ws-blocked-head">Already in the plan</p>
                  <p className="ws-note">
                    Remove its planned items before deleting. Set aside is the right answer for an
                    idea the team considered and will not pursue.
                  </p>
                  <button type="button" className="ws-btn-quiet" onClick={() => setConfirming(false)}>Close</button>
                </>
              ) : (
                <>
                  <p className="ws-note">Delete this idea? Its notes go with it.</p>
                  <div className="ws-danger-row">
                    <button type="button" className="ws-btn-danger"
                      onClick={() => startTransition(async () => {
                        const outcome = await deleteIdea(...r, idea.id);
                        if (outcome.ok) onDeleted(idea.id);
                        else setFailed(outcome.message ?? "That did not delete.");
                      })}>Delete it</button>
                    <button type="button" className="ws-btn-quiet" onClick={() => setConfirming(false)}>Keep it</button>
                  </div>
                  {failed ? <p className="ws-msg" role="status">{failed}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* Its own moment, or a beat inside somebody else's. */
function ScheduleSheet({
  route, idea, moments, onRun,
}: {
  route: Route;
  idea: Idea;
  moments: Array<{ id: string; label: string }>;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string }>) => void;
}) {
  const r = [route.clientSlug, route.eventSlug, route.edition] as const;
  const [mode, setMode] = useState<"own" | "inside">("own");
  const [day, setDay] = useState(
    idea.day && idea.day !== "all" ? idea.day : "sat",
  );
  const [daypart, setDaypart] = useState(idea.daypart ?? "afternoon");
  const [track, setTrack] = useState("Experience");
  const [momentId, setMomentId] = useState(moments[0]?.id ?? "");
  const [loose, setLoose] = useState(false);

  return (
    <div className="ws-sheet">
      <div className="ws-seg-tabs ws-seg-small" role="group" aria-label="How it is scheduled">
        <button type="button" aria-selected={mode === "own"} onClick={() => setMode("own")}>Its own moment</button>
        <button type="button" aria-selected={mode === "inside"} onClick={() => setMode("inside")}>Inside a moment</button>
      </div>

      {mode === "own" ? (
        <form className="ws-quick-form" action={(f) => onRun(() => scheduleIdea(...r, idea.id, {
          day, starts: loose ? "" : String(f.get("starts") ?? ""),
          minutes: String(f.get("minutes") ?? ""), daypart, track,
        }))}>
          <Select label="Day" value={day} onChange={setDay} options={DAYS} compact />
          {loose ? (
            <Select label="Part of day" value={daypart} onChange={setDaypart} options={DAYPARTS} compact />
          ) : (
            <>
              <input name="starts" placeholder="10:45 am" aria-label="Start time" autoFocus />
              <input name="minutes" inputMode="numeric" placeholder="30 min" aria-label="Duration in minutes" />
            </>
          )}
          <Select label="Track" value={track} onChange={setTrack} options={TRACKS} compact />
          <button type="submit" className="ws-btn">Add to weekend</button>
          <button type="button" className="ws-flag" onClick={() => setLoose((v) => !v)}>
            {loose ? "Use an exact time" : "No exact time yet"}
          </button>
        </form>
      ) : (
        <form className="ws-quick-form"
          action={(f) => onRun(() => placeIdeaInMoment(...r, idea.id, momentId, String(f.get("offset") ?? "0")))}>
          <Select label="Which moment" value={momentId} onChange={setMomentId}
            options={moments.map((m) => ({ value: m.id, label: m.label }))} />
          <input name="offset" type="number" step={1} defaultValue={0}
            aria-label="Minutes from that moment's start" />
          <button type="submit" className="ws-btn">Place it</button>
          <p className="ws-hint">Minutes from the start of that moment. It becomes a cue there, not a copy.</p>
        </form>
      )}
    </div>
  );
}

function RequirementSheet({
  route, ideaId, onRun,
}: {
  route: Route;
  ideaId: string;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string }>) => void;
}) {
  const r = [route.clientSlug, route.eventSlug, route.edition] as const;
  const [kind, setKind] = useState("supply");
  return (
    <form className="ws-quick-form"
      action={(f) => onRun(() => addIdeaRequirement(...r, ideaId, { name: String(f.get("name") ?? ""), kind }))}>
      <input name="name" placeholder="What must exist" maxLength={200} autoFocus aria-label="Requirement" />
      <Select label="Kind" value={kind} onChange={setKind} options={KINDS} compact />
      <button type="submit" className="ws-btn">Add</button>
    </form>
  );
}
