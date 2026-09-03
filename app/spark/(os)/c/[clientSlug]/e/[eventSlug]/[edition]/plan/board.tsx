"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { addIdea } from "./actions";
import { FILTER_LABEL, IDEA_FILTERS, toIdeaState, type IdeaFilter, type IdeaState } from "./idea-state";
import { IdeaPanel } from "./idea-panel";

/**
 * One collection of ideas, seen through whichever lens is useful.
 *
 * There are no columns, because there is no workflow to drag things through.
 * Every idea sits in one place; the filters are questions asked of the same
 * list, and what an idea has become is told by the marks on its card rather
 * than by which lane it is in.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Idea = {
  id: string;
  title: string;
  detail: string | null;
  question: string | null;
  state: IdeaState;
  reason: string | null;
  day: string | null;
  daypart: string | null;
  schedule: Array<{ id: string; label: string; href: string }>;
  inMoments: Array<{ id: string; label: string; href: string }>;
  actions: Array<{ id: string; title: string; sub: string }>;
  requirements: Array<{ id: string; name: string; sub: string }>;
  costs: Array<{ id: string; label: string; cents: number }>;
  notes: Array<{ author: string | null; body: string; at: string }>;
};

const DAY_SHORT: Record<string, string> = {
  wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

export const isPlanned = (idea: Idea) =>
  idea.schedule.length > 0 || idea.inMoments.length > 0 || idea.actions.length > 0 ||
  idea.requirements.length > 0 || idea.costs.length > 0;

export function IdeaBoard({
  ideas,
  route,
  planner,
  moments,
}: {
  ideas: Idea[];
  route: Route;
  planner: boolean;
  moments: Array<{ id: string; label: string }>;
}) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("open") : null,
  );
  const [filter, setFilter] = useState<IdeaFilter>(() => {
    if (typeof window === "undefined") return "all";
    const wanted = new URLSearchParams(window.location.search).get("show");
    return (IDEA_FILTERS as readonly string[]).includes(wanted ?? "") ? (wanted as IdeaFilter) : "all";
  });
  const [pending, setPending] = useState<Array<{ key: string; title: string }>>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const live = useMemo(() => ideas.filter((idea) => !removed.has(idea.id)), [ideas, removed]);
  const shownFilter = hydrated ? filter : "all";

  const counts = {
    all: live.filter((idea) => idea.state === "open").length,
    question: live.filter((idea) => idea.question && idea.state === "open").length,
    planned: live.filter((idea) => isPlanned(idea) && idea.state === "open").length,
    aside: live.filter((idea) => idea.state === "aside").length,
  };

  const shown = live.filter((idea) => {
    if (shownFilter === "aside") return idea.state === "aside";
    if (idea.state === "aside") return false;
    if (shownFilter === "question") return Boolean(idea.question);
    if (shownFilter === "planned") return isPlanned(idea);
    return true;
  });

  const settled = new Set(ideas.map((idea) => idea.title));
  const inFlight = pending.filter((entry) => !settled.has(entry.title));

  const add = (title: string) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [...prev.filter((e) => !settled.has(e.title)), { key, title }]);
    setFailure(null);
    startTransition(async () => {
      const outcome = await addIdea(route.clientSlug, route.eventSlug, route.edition, title);
      if (!outcome.ok) {
        setPending((prev) => prev.filter((entry) => entry.key !== key));
        setFailure(outcome.message ?? "That idea did not save.");
      }
    });
  };

  const open = hydrated ? live.find((idea) => idea.id === openId) ?? null : null;

  const card = (idea: Idea) => {
    const cost = idea.costs.reduce((sum, row) => sum + row.cents, 0);
    return (
      <button key={idea.id} type="button"
        className={`ws-card ${idea.question ? "ws-card-question" : ""} ${isPlanned(idea) ? "ws-card-planned" : ""}`}
        onClick={() => setOpenId(idea.id)}>
        <span className="ws-card-title">{idea.title}</span>
        <span className="ws-card-meta">
          {idea.question ? <em className="ws-chip ws-chip-q">Needs answer</em> : null}
          {idea.schedule.length > 0 ? <em className="ws-chip ws-chip-mark">Scheduled</em> : null}
          {idea.inMoments.length > 0 ? <em className="ws-chip ws-chip-mark">In run of show</em> : null}
          {idea.actions.length > 0 ? <em className="ws-chip ws-chip-mark">{idea.actions.length} action{idea.actions.length === 1 ? "" : "s"}</em> : null}
          {idea.requirements.length > 0 ? <em className="ws-chip ws-chip-mark">{idea.requirements.length} req</em> : null}
          {cost > 0 ? <em className="ws-chip ws-chip-mark">{money(cost)}</em> : null}
          {idea.day && idea.schedule.length === 0 ? (
            <em className="ws-chip ws-chip-day">
              {DAY_SHORT[idea.day] ?? idea.day}
              {idea.daypart && idea.daypart !== "anytime" ? ` ${idea.daypart}` : ""}
            </em>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="ws-bar">
        <div className="ws-filters" role="group" aria-label="Show">
          {IDEA_FILTERS.map((key) => (
            <button key={key} type="button" aria-pressed={shownFilter === key}
              onClick={() => setFilter(key)}>
              {FILTER_LABEL[key]} <em>{counts[key]}</em>
            </button>
          ))}
        </div>
        <div className="ws-bar-right">
          {failure ? <span className="ws-failure" role="status">{failure}</span> : null}
        </div>
      </div>

      {planner && shownFilter !== "aside" ? <QuickAdd onAdd={add} /> : null}

      <div className="ws-collection">
        {shown.map(card)}
        {shownFilter === "all"
          ? inFlight.map((entry) => (
              <span key={entry.key} className="ws-card ws-card-pending">
                <span className="ws-card-title">{entry.title}</span>
              </span>
            ))
          : null}
        {shown.length === 0 && inFlight.length === 0 ? (
          <p className="ws-lane-empty">Nothing here.</p>
        ) : null}
      </div>

      {open ? (
        <IdeaPanel idea={open} route={route} planner={planner} moments={moments}
          onClose={() => setOpenId(null)}
          onDeleted={(id) => { setRemoved((prev) => new Set(prev).add(id)); setOpenId(null); }} />
      ) : null}
    </>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form className="ws-quickadd ws-quickadd-wide" onSubmit={(event) => {
      event.preventDefault();
      const title = value.trim();
      if (!title) return;
      setValue("");
      onAdd(title);
    }}>
      <input value={value} placeholder="Add an idea" maxLength={200} aria-label="Add an idea"
        onChange={(event) => setValue(event.target.value)} />
    </form>
  );
}

export { toIdeaState };
