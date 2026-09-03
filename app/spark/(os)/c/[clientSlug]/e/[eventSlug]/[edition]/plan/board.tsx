"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { Select } from "@spark/_components/select";
import { addIdea } from "./actions";
import { toIdeaState, type IdeaState } from "./idea-state";
import { IdeaPanel } from "./idea-panel";

/**
 * The ideas, arranged the way the weekend is built.
 *
 * A day is not a schedule. It is the rough sense of where something belongs,
 * and it is the most useful thing to group by, because a room does not plan
 * forty one unrelated records: it plans Thursday, then Friday, then Saturday.
 * Day is therefore the primary navigation and the states are a quiet second.
 *
 * Nothing here is a calendar. Only a real scheduled moment has a clock time,
 * and the card says so when it has one.
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
  { key: "", label: "Whole weekend", short: "Whole weekend" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
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
  ideas, route, planner, moments,
}: {
  ideas: Idea[];
  route: Route;
  planner: boolean;
  moments: Array<{ id: string; label: string }>;
}) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("open") : null);
  const [day, setDay] = useState<string | null>(null);
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
  const shownDay = hydrated ? day : null;

  const open = live.filter((idea) => idea.state === "open");
  const withQuestion = open.filter((idea) => idea.question);
  const aside = live.filter((idea) => idea.state === "aside");

  const pool = shownLens === "aside" ? aside : shownLens === "question" ? withQuestion : open;
  const shown = shownDay === null ? pool : pool.filter((idea) => (idea.day ?? "") === shownDay);

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
    return (
      <button key={idea.id} type="button"
        className={`ws-idea ${idea.question ? "ws-idea-q" : ""} ${isPlanned(idea) ? "ws-idea-real" : ""}`}
        onClick={() => setOpenId(idea.id)}>
        <span className="ws-idea-title">{idea.title}</span>
        <span className="ws-idea-marks">
          {idea.question ? <em className="ws-mark ws-mark-q">Needs answer</em> : null}
          {at ? <em className="ws-mark ws-mark-when">{at}</em> : null}
          {!at && idea.schedule.length > 0 ? <em className="ws-mark ws-mark-when">Scheduled</em> : null}
          {idea.inMoments.length > 0 ? <em className="ws-mark ws-mark-when">In run of show</em> : null}
          {idea.actions.length > 0 ? <em className="ws-mark">{idea.actions.length} action{idea.actions.length === 1 ? "" : "s"}</em> : null}
          {idea.requirements.length > 0 ? <em className="ws-mark">{idea.requirements.length} req</em> : null}
          {cost > 0 ? <em className="ws-mark">{money(cost)}</em> : null}
          {idea.answer ? <em className="ws-mark ws-mark-ok">Decided</em> : null}
        </span>
      </button>
    );
  };

  const group = (key: string) => {
    const rows = shown.filter((idea) => (idea.day ?? "") === key);
    const flight = key === "" || shownDay === key
      ? inFlight.filter((entry) => (entry.day ?? "") === key)
      : [];
    if (rows.length === 0 && flight.length === 0) return null;
    const label = DAYS.find((d) => d.key === key)?.label ?? key;
    return (
      <section key={key || "whole"} className="ws-daygroup" aria-label={label}>
        <header className="ws-daygroup-head">
          <h3>{label}</h3>
          <span>{rows.length + flight.length}</span>
        </header>
        <div className="ws-ideas">
          {rows.map(card)}
          {flight.map((entry) => (
            <span key={entry.key} className="ws-idea ws-idea-pending">
              <span className="ws-idea-title">{entry.title}</span>
            </span>
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      <div className="ws-planbar">
        <nav className="ws-days-nav" aria-label="Day">
          <button type="button" aria-pressed={shownDay === null} onClick={() => setDay(null)}>
            All weekend
          </button>
          {DAYS.filter((d) => d.key).map((d) => {
            const n = pool.filter((idea) => idea.day === d.key).length;
            return (
              <button key={d.key} type="button" aria-pressed={shownDay === d.key}
                onClick={() => setDay(shownDay === d.key ? null : d.key)}>
                {d.short}{n > 0 ? <em>{n}</em> : null}
              </button>
            );
          })}
        </nav>
        <div className="ws-lenses">
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
      </div>

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}

      {shownDay === null
        ? DAYS.map((d) => group(d.key))
        : (
            <div className="ws-ideas">
              {shown.map(card)}
              {inFlight.filter((e) => (e.day ?? "") === shownDay).map((entry) => (
                <span key={entry.key} className="ws-idea ws-idea-pending">
                  <span className="ws-idea-title">{entry.title}</span>
                </span>
              ))}
            </div>
          )}

      {shown.length === 0 && inFlight.length === 0 ? (
        <p className="ws-empty-line">
          {shownLens === "aside" ? "Nothing set aside." : "No ideas here yet."}
        </p>
      ) : null}

      {planner ? <AddButton onOpen={() => setAdding(true)} /> : null}
      {adding ? <AddIdea defaultDay={shownDay ?? ""} onAdd={add} onClose={() => setAdding(false)} /> : null}

      {opened ? (
        <IdeaPanel idea={opened} route={route} planner={planner} moments={moments}
          onClose={() => setOpenId(null)}
          onDeleted={(id) => { setRemoved((prev) => new Set(prev).add(id)); setOpenId(null); }} />
      ) : null}
    </>
  );
}

function AddButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="ws-add-fab" onClick={onOpen}>
      <span aria-hidden="true">+</span> Add idea
    </button>
  );
}

/** Capture first, plan later: a name, and roughly where it belongs. */
function AddIdea({
  defaultDay, onAdd, onClose,
}: {
  defaultDay: string;
  onAdd: (title: string, day: string | null) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);

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

          <p className="ws-modal-label">Where might it fit?</p>
          <div className="ws-modal-days">
            {DAYS.map((d) => (
              <button key={d.key || "whole"} type="button" aria-pressed={day === d.key}
                onClick={() => setDay(d.key)}>{d.label}</button>
            ))}
          </div>

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
