"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Select } from "@spark/_components/select";
import {
  addIdeaAction, addIdeaCost, addIdeaNote, addIdeaRequirement, deleteIdea,
  describeIdea, placeIdeaInMoment, renameIdea, scheduleIdea, setIdeaQuestion,
  setIdeaState,
} from "./actions";
import type { Idea } from "./board";

/**
 * The idea, and everything that has come of it.
 *
 * One screen, opening outward. At rest it is a title, a description and four
 * things it could become. As the idea becomes real those four turn into what
 * they produced, and the panel becomes the place to see the whole of it: when
 * it happens, who is carrying it, what it needs, what it costs, and the
 * question still hanging over it if there is one.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };
type Sheet = "schedule" | "action" | "cost" | "requirement" | null;

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
  idea,
  route,
  planner,
  moments,
  onClose,
  onDeleted,
}: {
  idea: Idea;
  route: Route;
  planner: boolean;
  moments: Array<{ id: string; label: string }>;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [, startTransition] = useTransition();

  const r = [route.clientSlug, route.eventSlug, route.edition] as const;
  const inThePlan =
    idea.schedule.length > 0 || idea.inMoments.length > 0 || idea.actions.length > 0 ||
    idea.requirements.length > 0 || idea.costs.length > 0;
  const costTotal = idea.costs.reduce((sum, cost) => sum + cost.cents, 0);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const outcome = await fn();
      if (outcome.ok) { setSheet(null); setFailed(null); }
      else setFailed(outcome.message ?? "That did not save.");
    });

  return (
    <div className="ws-panel-wrap" role="dialog" aria-modal="true" aria-label={idea.title}>
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-panel ws-panel-wide">
        <header className="ws-panel-head">
          <p className="ws-panel-kicker">{idea.state === "aside" ? "Set aside" : "Idea"}</p>
          <button type="button" className="ws-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="ws-panel-body">
          {/* The title is the idea, so it is edited where it is read. */}
          {planner ? (
            <input
              className="ws-title-edit"
              defaultValue={idea.title}
              maxLength={200}
              aria-label="Idea"
              onBlur={(event) => {
                if (event.target.value.trim() && event.target.value.trim() !== idea.title) {
                  const title = event.target.value;
                  startTransition(async () => { await renameIdea(...r, idea.id, title); });
                }
              }}
            />
          ) : (
            <h3 className="ws-panel-title">{idea.title}</h3>
          )}

          {planner ? (
            <textarea
              className="ws-detail"
              defaultValue={idea.detail ?? ""}
              rows={2}
              maxLength={1000}
              placeholder="Description"
              aria-label="Description"
              onBlur={(event) => {
                if ((idea.detail ?? "") !== event.target.value) {
                  const detail = event.target.value;
                  startTransition(async () => { await describeIdea(...r, idea.id, detail); });
                }
              }}
            />
          ) : idea.detail ? (
            <p className="ws-note">{idea.detail}</p>
          ) : null}

          {/* The open question: attention, answerable in place. */}
          {idea.question ? (
            <div className="ws-question">
              <p className="ws-question-label">Needs answer</p>
              <p className="ws-question-text">{idea.question}</p>
              {planner ? (
                <button
                  type="button"
                  className="ws-btn-quiet"
                  onClick={() => startTransition(async () => { await setIdeaQuestion(...r, idea.id, ""); })}
                >
                  Answered
                </button>
              ) : null}
            </div>
          ) : planner && askingQuestion ? (
            <form
              className="ws-quick-form"
              action={(formData) =>
                run(async () => {
                  const outcome = await setIdeaQuestion(...r, idea.id, String(formData.get("q") ?? ""));
                  if (outcome.ok) setAskingQuestion(false);
                  return outcome;
                })
              }
            >
              <input name="q" placeholder="What is unresolved?" maxLength={400} autoFocus aria-label="Question" />
              <button type="submit" className="ws-btn">Flag</button>
            </form>
          ) : planner ? (
            <button type="button" className="ws-flag" onClick={() => setAskingQuestion(true)}>
              Flag a question
            </button>
          ) : null}

          {/* ---------------------------------------------------- the plan */}
          <div className="ws-panel-section">
            <p className="ws-panel-sub">Plan</p>

            {planner ? (
              <div className="ws-quick-row">
                <button type="button" className={`ws-quick-btn ${idea.schedule.length || idea.inMoments.length ? "ws-quick-done" : ""} ${sheet === "schedule" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "schedule" ? null : "schedule")}>
                  {idea.schedule.length || idea.inMoments.length ? "✓ " : "+ "}Schedule
                </button>
                <button type="button" className={`ws-quick-btn ${idea.actions.length ? "ws-quick-done" : ""} ${sheet === "action" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "action" ? null : "action")}>
                  {idea.actions.length ? "✓ " : "+ "}Action
                </button>
                <button type="button" className={`ws-quick-btn ${idea.costs.length ? "ws-quick-done" : ""} ${sheet === "cost" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "cost" ? null : "cost")}>
                  {idea.costs.length ? "✓ " : "+ "}Cost
                </button>
                <button type="button" className={`ws-quick-btn ${idea.requirements.length ? "ws-quick-done" : ""} ${sheet === "requirement" ? "ws-quick-on" : ""}`}
                  onClick={() => setSheet(sheet === "requirement" ? null : "requirement")}>
                  {idea.requirements.length ? "✓ " : "+ "}Requirement
                </button>
              </div>
            ) : null}

            {sheet === "schedule" ? (
              <ScheduleSheet route={route} ideaId={idea.id} idea={idea} moments={moments} onRun={run} />
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
                <input name="label" placeholder="What the money is for" maxLength={200} autoFocus aria-label="Cost" />
                <span className="ws-quick-prefix">$</span>
                <input name="dollars" inputMode="decimal" placeholder="0" aria-label="Amount" />
                <button type="submit" className="ws-btn">Add</button>
              </form>
            ) : null}

            {sheet === "requirement" ? (
              <RequirementSheet route={route} ideaId={idea.id} onRun={run} />
            ) : null}

            {failed ? <p className="ws-msg" role="status">{failed}</p> : null}

            {/* What has come of it, as it accumulates. */}
            {idea.schedule.map((row) => (
              <Link key={row.id} className="ws-link" href={row.href}>
                <b>When</b> {row.label}
              </Link>
            ))}
            {idea.inMoments.map((row) => (
              <Link key={row.id} className="ws-link" href={row.href}>
                <b>In run of show</b> {row.label}
              </Link>
            ))}
            {idea.actions.length > 0 ? (
              <div className="ws-sub-list">
                <p className="ws-sub-head">Actions</p>
                {idea.actions.map((row) => (
                  <p key={row.id} className="ws-noteline">
                    {row.title}<span>{row.sub || "Unassigned"}</span>
                  </p>
                ))}
              </div>
            ) : null}
            {idea.requirements.length > 0 ? (
              <div className="ws-sub-list">
                <p className="ws-sub-head">Requirements</p>
                {idea.requirements.map((row) => (
                  <p key={row.id} className="ws-noteline">{row.name}<span>{row.sub}</span></p>
                ))}
              </div>
            ) : null}
            {idea.costs.length > 0 ? (
              <div className="ws-sub-list">
                <p className="ws-sub-head">Costs</p>
                {idea.costs.map((row) => (
                  <p key={row.id} className="ws-costline">{row.label}<b>{money(row.cents)}</b></p>
                ))}
                <p className="ws-costline ws-costtotal">Idea total<b>{money(costTotal)}</b></p>
              </div>
            ) : null}
          </div>

          {/* --------------------------------------------------- set aside */}
          {planner ? (
            <div className="ws-panel-section">
              {idea.state === "aside" ? (
                <>
                  {idea.reason ? <p className="ws-note">{idea.reason}</p> : null}
                  <button type="button" className="ws-btn-quiet"
                    onClick={() => startTransition(async () => { await setIdeaState(...r, idea.id, "open"); })}>
                    Bring back
                  </button>
                </>
              ) : (
                <button type="button" className="ws-btn-quiet"
                  onClick={() => startTransition(async () => { await setIdeaState(...r, idea.id, "aside"); })}>
                  Set aside
                </button>
              )}
            </div>
          ) : null}

          {/* ------------------------------------------------------ removal */}
          {planner ? (
            <div className="ws-panel-section ws-danger">
              {inThePlan ? (
                <>
                  <p className="ws-blocked-head">Already in the plan</p>
                  <p className="ws-note">
                    Remove its planned items before deleting this idea. Set aside is the
                    right answer for an idea the team considered and will not pursue.
                  </p>
                </>
              ) : confirming ? (
                <>
                  <p className="ws-note">Delete this idea? Its notes go with it.</p>
                  <div className="ws-danger-row">
                    <button type="button" className="ws-btn-danger"
                      onClick={() => startTransition(async () => {
                        const outcome = await deleteIdea(...r, idea.id);
                        if (outcome.ok) onDeleted(idea.id);
                        else setFailed(outcome.message ?? "That did not delete.");
                      })}>
                      Delete it
                    </button>
                    <button type="button" className="ws-btn-quiet" onClick={() => setConfirming(false)}>
                      Keep it
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="ws-delete" onClick={() => setConfirming(true)}>
                  Delete this idea
                </button>
              )}
            </div>
          ) : null}

          <div className="ws-panel-section">
            <p className="ws-panel-sub">Notes</p>
            {idea.notes.map((entry, index) => (
              <p key={index} className="ws-noteline">
                {entry.body}<span>{entry.author ?? ""} · {entry.at}</span>
              </p>
            ))}
            <form className="ws-noteform" action={() => startTransition(async () => {
              if (!note.trim()) return;
              const body = note; setNote("");
              await addIdeaNote(...r, idea.id, body);
            })}>
              <input value={note} maxLength={1000} placeholder="Add a note"
                aria-label="Note" onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="ws-btn-quiet" disabled={!note.trim()}>Add</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Two ways onto the weekend: its own moment, or inside somebody else's. */
function ScheduleSheet({
  route, ideaId, idea, moments, onRun,
}: {
  route: Route;
  ideaId: string;
  idea: Idea;
  moments: Array<{ id: string; label: string }>;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string }>) => void;
}) {
  const r = [route.clientSlug, route.eventSlug, route.edition] as const;
  const [mode, setMode] = useState<"own" | "inside">("own");
  const [day, setDay] = useState(idea.day ?? "sat");
  const [daypart, setDaypart] = useState(idea.daypart ?? "afternoon");
  const [track, setTrack] = useState("Experience");
  const [momentId, setMomentId] = useState(moments[0]?.id ?? "");

  return (
    <div className="ws-sheet">
      <div className="ws-seg-tabs" role="group" aria-label="How it is scheduled">
        <button type="button" aria-selected={mode === "own"} onClick={() => setMode("own")}>
          Its own moment
        </button>
        <button type="button" aria-selected={mode === "inside"} onClick={() => setMode("inside")}>
          Inside a moment
        </button>
      </div>

      {mode === "own" ? (
        <form className="ws-quick-form" action={(f) => onRun(() => scheduleIdea(...r, ideaId, {
          day, starts: String(f.get("starts") ?? ""), minutes: String(f.get("minutes") ?? ""),
          daypart, track, location: String(f.get("location") ?? ""),
        }))}>
          <Select label="Day" value={day} onChange={setDay} options={DAYS} compact />
          <input name="starts" placeholder="10:45 am" aria-label="Start time" autoFocus />
          <input name="minutes" inputMode="numeric" placeholder="30 min" aria-label="Duration in minutes" />
          <Select label="Track" value={track} onChange={setTrack} options={TRACKS} compact />
          <input name="location" placeholder="Where" maxLength={120} aria-label="Where" />
          <button type="submit" className="ws-btn">Schedule</button>
          <p className="ws-hint">
            Leave the time empty to place it loosely.{" "}
            <span className="ws-hint-inline">
              <Select label="Part of day" value={daypart} onChange={setDaypart} options={DAYPARTS} compact />
            </span>
          </p>
        </form>
      ) : (
        <form className="ws-quick-form" action={(f) =>
          onRun(() => placeIdeaInMoment(...r, ideaId, momentId, String(f.get("offset") ?? "0")))}>
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
    <form className="ws-quick-form" action={(f) =>
      onRun(() => addIdeaRequirement(...r, ideaId, { name: String(f.get("name") ?? ""), kind }))}>
      <input name="name" placeholder="What must exist" maxLength={200} autoFocus aria-label="Requirement" />
      <Select label="Kind" value={kind} onChange={setKind} options={KINDS} compact />
      <button type="submit" className="ws-btn">Add</button>
    </form>
  );
}
