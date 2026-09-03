"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { addIdea } from "./actions";
import { toIdeaState, type IdeaState } from "./idea-state";
import { IdeaPanel } from "./idea-panel";

/**
 * The weekend, left to right, as loose ideas.
 *
 * The same five columns the calendar uses, holding what might happen rather
 * than what will. Ideas and Weekend are deliberately siblings: one asks what
 * could happen each day, the other what actually happens and when, and the
 * eye moves between them without relearning the shape of the week.
 *
 * The columns are the day navigation, so there is no day filter above them
 * repeating what the layout already says. A card carries no day chip for the
 * same reason: the column it sits in has already told you.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Idea = {
  id: string;
  title: string;
  detail: string | null;
  question: string | null;
  answer: string | null;
  state: IdeaState;
  reason: string | null;
  day: string | null;
  daypart: string | null;
  schedule: Array<{ id: string; label: string; href: string; at: string | null }>;
  inMoments: Array<{ id: string; label: string; href: string }>;
  actions: Array<{ id: string; title: string; sub: string }>;
  requirements: Array<{ id: string; name: string; sub: string }>;
  costs: Array<{ id: string; label: string; cents: number }>;
  notes: Array<{ author: string | null; body: string; at: string }>;
};

const DAYS = [
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

/* Placement at capture is optional and defaults to not knowing. */
const ADD_PLACEMENTS = [
  { key: "", label: "Not sure yet" },
  { key: "all", label: "Event-wide" },
  ...DAYS.map((d) => ({ key: d.key, label: d.short })),
];

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

export const isPlanned = (idea: Idea) =>
  idea.schedule.length > 0 || idea.inMoments.length > 0 || idea.actions.length > 0 ||
  idea.requirements.length > 0 || idea.costs.length > 0;

type Lens = "open" | "question" | "aside";

export function IdeaBoard({
  ideas, route, planner, moments, tabs,
}: {
  ideas: Idea[];
  route: Route;
  planner: boolean;
  moments: Array<{ id: string; label: string }>;
  tabs: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("open") : null);
  const [lens, setLens] = useState<Lens>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("show") === "question" ? "question" : "open");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Array<{ key: string; title: string; day: string | null }>>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const live = useMemo(() => ideas.filter((idea) => !removed.has(idea.id)), [ideas, removed]);
  const shownLens = hydrated ? lens : "open";

  const open = live.filter((idea) => idea.state === "open");
  const withQuestion = open.filter((idea) => idea.question);
  const aside = live.filter((idea) => idea.state === "aside");

  const pool = shownLens === "aside" ? aside : shownLens === "question" ? withQuestion : open;
  /* Two different things, kept apart: nobody has placed this yet, and this
     genuinely spans the event. */
  const unplaced = pool.filter((idea) => !idea.day);
  const eventWide = pool.filter((idea) => idea.day === "all");

  /* The phone shows one day at a time. The first day that has anything is a
     better landing than an arbitrary one, and it is the same on both sides
     of hydration because it is derived from the data. */
  const firstBusy = DAYS.find((d) => pool.some((idea) => idea.day === d.key))?.key ?? "thu";
  const [mobileDay, setMobileDay] = useState<string>(firstBusy);
  const shownMobileDay = hydrated ? mobileDay : firstBusy;

  const settled = new Set(ideas.map((idea) => idea.title));
  const inFlight = pending.filter((entry) => !settled.has(entry.title));

  const add = (title: string, placement: string | null) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [...prev.filter((e) => !settled.has(e.title)), { key, title, day: placement }]);
    setFailure(null);
    setAdding(false);
    startTransition(async () => {
      const outcome = await addIdea(route.clientSlug, route.eventSlug, route.edition, title, placement);
      if (!outcome.ok) {
        setPending((prev) => prev.filter((entry) => entry.key !== key));
        setFailure(outcome.message ?? "That idea did not save.");
      }
    });
  };

  const opened = hydrated ? live.find((idea) => idea.id === openId) ?? null : null;

  const card = (idea: Idea) => {
    const cost = idea.costs.reduce((sum, row) => sum + row.cents, 0);
    const at = idea.schedule.find((row) => row.at)?.at ?? null;
    const marks: React.ReactNode[] = [];
    if (idea.question) marks.push(<em key="q" className="ws-mark ws-mark-q">Needs answer</em>);
    if (at) marks.push(<em key="at" className="ws-mark ws-mark-when">{at}</em>);
    else if (idea.schedule.length > 0) marks.push(<em key="s" className="ws-mark ws-mark-when">Scheduled</em>);
    if (idea.inMoments.length > 0) marks.push(<em key="m" className="ws-mark ws-mark-when">In run of show</em>);
    if (idea.actions.length > 0) {
      marks.push(<em key="a" className="ws-mark">{idea.actions.length} action{idea.actions.length === 1 ? "" : "s"}</em>);
    }
    if (idea.requirements.length > 0) marks.push(<em key="r" className="ws-mark">{idea.requirements.length} req</em>);
    if (cost > 0) marks.push(<em key="c" className="ws-mark">{money(cost)}</em>);
    if (idea.answer) marks.push(<em key="d" className="ws-mark ws-mark-ok">Decided</em>);

    return (
      <button key={idea.id} type="button"
        className={`ws-idea ${idea.question ? "ws-idea-q" : ""} ${isPlanned(idea) ? "ws-idea-real" : ""}`}
        onClick={() => setOpenId(idea.id)}>
        <span className="ws-idea-title">{idea.title}</span>
        {marks.length > 0 ? <span className="ws-idea-marks">{marks}</span> : null}
      </button>
    );
  };

  const flightFor = (key: string | null) =>
    inFlight.filter((entry) => (entry.day ?? null) === key);

  return (
    <>
      <div className="ws-plan-top">
        <div className="ws-plan-titles">
          <h2 className="ws-title">Plan</h2>
          {tabs}
        </div>
        {planner ? (
          <button type="button" className="ws-add-btn" onClick={() => setAdding(true)}>
            <span aria-hidden="true">+</span> Add idea
          </button>
        ) : null}
      </div>

      {(withQuestion.length > 0 || aside.length > 0) ? (
        <div className="ws-lenses ws-lenses-quiet">
          {withQuestion.length > 0 ? (
            <button type="button" className={shownLens === "question" ? "ws-lens-on" : ""}
              onClick={() => setLens(shownLens === "question" ? "open" : "question")}>
              Needs answer <em>{withQuestion.length}</em>
            </button>
          ) : null}
          {aside.length > 0 ? (
            <button type="button" className={shownLens === "aside" ? "ws-lens-on" : ""}
              onClick={() => setLens(shownLens === "aside" ? "open" : "aside")}>
              Set aside <em>{aside.length}</em>
            </button>
          ) : null}
        </div>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}

      {unplaced.length > 0 || flightFor(null).length > 0 ? (
        <section className="ws-tray ws-tray-unplaced" aria-label="Unplaced ideas">
          <p className="ws-tray-label">
            Unplaced <span>{unplaced.length + flightFor(null).length}</span>
          </p>
          <div className="ws-tray-cards">
            {unplaced.map(card)}
            {flightFor(null).map((entry) => (
              <span key={entry.key} className="ws-idea ws-idea-pending">
                <span className="ws-idea-title">{entry.title}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {eventWide.length > 0 || flightFor("all").length > 0 ? (
        <section className="ws-tray ws-tray-wide" aria-label="Event-wide ideas">
          <p className="ws-tray-label">
            Event-wide <span>{eventWide.length + flightFor("all").length}</span>
          </p>
          <div className="ws-tray-cards">
            {eventWide.map(card)}
            {flightFor("all").map((entry) => (
              <span key={entry.key} className="ws-idea ws-idea-pending">
                <span className="ws-idea-title">{entry.title}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* The phone gets one day at a time; the desktop gets all five. */}
      <nav className="ws-mobile-days" aria-label="Day">
        {DAYS.map((d) => (
          <button key={d.key} type="button" aria-pressed={shownMobileDay === d.key}
            onClick={() => setMobileDay(d.key)}>
            {d.short}
            <em>{pool.filter((idea) => idea.day === d.key).length}</em>
          </button>
        ))}
      </nav>

      <div className="ws-board">
        {DAYS.map((d) => {
          const rows = pool.filter((idea) => idea.day === d.key);
          const flight = flightFor(d.key);
          return (
            <section key={d.key}
              className={`ws-col ${shownMobileDay === d.key ? "ws-col-active" : ""}`}
              aria-label={d.label}>
              <header className="ws-col-head">
                <h3>{d.label}</h3>
                <span>{rows.length + flight.length}</span>
              </header>
              <div className="ws-col-cards">
                {rows.map(card)}
                {flight.map((entry) => (
                  <span key={entry.key} className="ws-idea ws-idea-pending">
                    <span className="ws-idea-title">{entry.title}</span>
                  </span>
                ))}
                {rows.length === 0 && flight.length === 0 ? (
                  <p className="ws-col-empty">Nothing yet</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {adding ? <AddIdea onAdd={add} onClose={() => setAdding(false)} /> : null}

      {opened ? (
        <IdeaPanel idea={opened} route={route} planner={planner} moments={moments}
          onClose={() => setOpenId(null)}
          onDeleted={(id) => { setRemoved((prev) => new Set(prev).add(id)); setOpenId(null); }} />
      ) : null}
    </>
  );
}

/** Capture first, plan later: a name, and roughly where it belongs. */
function AddIdea({
  onAdd, onClose,
}: {
  onAdd: (title: string, day: string | null) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [placing, setPlacing] = useState(false);

  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true" aria-label="Add an idea">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onAdd(title.trim(), day || null);
        }}>
          <label className="ws-modal-label" htmlFor="new-idea">What is the idea?</label>
          <input id="new-idea" className="ws-modal-input" value={title} maxLength={200} autoFocus
            placeholder="Glow run" onChange={(event) => setTitle(event.target.value)} />

          {placing ? (
            <>
              <p className="ws-modal-label">Where might it fit? <em>Optional</em></p>
              <div className="ws-modal-days">
                {ADD_PLACEMENTS.map((d) => (
                  <button key={d.key || "unplaced"} type="button" aria-pressed={day === d.key}
                    onClick={() => setDay(d.key)}>{d.label}</button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="ws-flag ws-place-toggle" onClick={() => setPlacing(true)}>
              + Add placement
            </button>
          )}

          <div className="ws-modal-actions">
            <button type="submit" className="ws-btn" disabled={!title.trim()}>Add idea</button>
            <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { toIdeaState };
