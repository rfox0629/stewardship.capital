"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { addIdea, addIdeaNote, deleteIdea, describeIdea, placeIdea, setIdeaState } from "./actions";
import { toIdeaState, type IdeaState } from "./idea-state";
import { AddToPlan } from "./add-to-plan";

/**
 * What are we considering, and what needs an answer.
 *
 * Two lanes, because those are the only two questions this view exists to
 * settle. Where an idea might sit in the weekend is the calendar's question,
 * not this one, so a day is a chip on a card here rather than a column: the
 * two views stopped duplicating each other the moment this one stopped being
 * a second calendar.
 *
 * Set aside and everything already in the plan are one click away and out of
 * the way. A card is quiet until it is opened.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Idea = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  day: string | null;
  daypart: string | null;
  decision: string | null;
  decidedBy: string | null;
  /** Dollars already attached to this idea, if any. */
  costDollars: number | null;
  /** A requirement of this idea is recorded but not yet settled. */
  needsUnresolved: boolean;
  links: Array<{ kind: string; label: string; href: string }>;
  notes: Array<{ author: string | null; body: string; at: string }>;
};

const DAYS = [
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const DAYPARTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "anytime", label: "Anytime" },
];

const MARK: Record<string, string> = {
  Schedule: "When",
  Action: "Who",
  Need: "Need",
  Budget: "Cost",
};

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export function IdeaBoard({
  ideas,
  route,
  planner,
}: {
  ideas: Idea[];
  route: Route;
  planner: boolean;
}) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("open")
      : null,
  );
  const [stateOverride, setStateOverride] = useState<Map<string, IdeaState>>(new Map());
  const [placeOverride, setPlaceOverride] = useState<
    Map<string, { day: string | null; daypart: string | null }>
  >(new Map());
  const [pending, setPending] = useState<Array<{ key: string; title: string }>>([]);
  const [shelf, setShelf] = useState<"aside" | "planned" | null>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("shelf") === "planning"
      ? "planned"
      : null,
  );
  const [onlyGaps, setOnlyGaps] = useState(true);
  const [overLane, setOverLane] = useState<IdeaState | null>(null);
  /* Ideas deleted here, hidden at once rather than after the round trip. */
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const merged = useMemo(
    () =>
      ideas
        .filter((idea) => !removed.has(idea.id))
        .map((idea) => {
        const placed = placeOverride.get(idea.id);
        return {
          ...idea,
          state: stateOverride.get(idea.id) ?? toIdeaState(idea.status),
          day: placed ? placed.day : idea.day,
          daypart: placed ? placed.daypart : idea.daypart,
        };
        }),
    [ideas, stateOverride, placeOverride, removed],
  );

  type Card = (typeof merged)[number];

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

  const move = (idea: Card, state: IdeaState, reason?: string) => {
    setStateOverride((prev) => new Map(prev).set(idea.id, state));
    setFailure(null);
    startTransition(async () => {
      const outcome = await setIdeaState(
        route.clientSlug, route.eventSlug, route.edition, idea.id, state, reason,
      );
      if (!outcome.ok) {
        setStateOverride((prev) => {
          const next = new Map(prev);
          next.delete(idea.id);
          return next;
        });
        setFailure("That did not save, so the card went back.");
      }
    });
  };

  const place = (idea: Card, day: string | null, daypart: string | null) => {
    setPlaceOverride((prev) => new Map(prev).set(idea.id, { day, daypart }));
    startTransition(async () => {
      const outcome = await placeIdea(
        route.clientSlug, route.eventSlug, route.edition, idea.id, day, daypart,
      );
      if (!outcome.ok) {
        setPlaceOverride((prev) => {
          const next = new Map(prev);
          next.delete(idea.id);
          return next;
        });
        setFailure("That placement did not save.");
      }
    });
  };

  const onDrop = (lane: IdeaState) => (event: React.DragEvent) => {
    event.preventDefault();
    setOverLane(null);
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const idea = merged.find((candidate) => candidate.id === id);
    if (idea && idea.state !== lane) move(idea, lane);
  };

  const considering = merged.filter((idea) => idea.state === "considering");
  const deciding = merged.filter((idea) => idea.state === "discuss");
  const aside = merged.filter((idea) => idea.state === "aside");
  const planned = merged.filter((idea) => idea.state === "planned");
  const open = hydrated ? merged.find((idea) => idea.id === openId) ?? null : null;
  const shownShelf = hydrated ? shelf : null;

  /* What an idea in the plan is still missing. Absence, stated plainly: an
     idea with no time is genuinely unscheduled, and one with no owner has
     nobody carrying it. Nothing here says an idea must have all four. */
  const gapsOf = (idea: Card) => {
    const kinds = new Set(idea.links.map((link) => link.kind));
    return [
      ...(kinds.has("Schedule") ? [] : ["No time yet"]),
      ...(kinds.has("Action") ? [] : ["No owner yet"]),
      ...(idea.needsUnresolved ? ["Requirement open"] : []),
    ];
  };
  const needsPlanning = planned.filter((idea) => gapsOf(idea).length > 0);

  const dayChip = (idea: Card) => {
    if (!idea.day) return null;
    const day = DAYS.find((d) => d.key === idea.day);
    return (
      <em className="ws-chip ws-chip-day">
        {day?.short ?? idea.day}
        {idea.daypart && idea.daypart !== "anytime" ? ` ${idea.daypart}` : ""}
      </em>
    );
  };

  const card = (idea: Card) => {
    const kinds = [...new Set(idea.links.map((link) => link.kind))];
    return (
      <button
        key={idea.id}
        type="button"
        className={`ws-card ws-card-${idea.state}`}
        draggable={planner}
        onDragStart={() => { dragId.current = idea.id; }}
        onClick={() => setOpenId(idea.id)}
      >
        <span className="ws-card-title">{idea.title}</span>
        {(idea.day || kinds.length > 0 || idea.notes.length > 0) && (
          <span className="ws-card-meta">
            {dayChip(idea)}
            {kinds.map((kind) => (
              <em key={kind} className="ws-chip ws-chip-mark">{MARK[kind] ?? kind}</em>
            ))}
            {idea.notes.length > 0 ? <em className="ws-chip">{idea.notes.length}</em> : null}
          </span>
        )}
      </button>
    );
  };

  const lane = (
    key: IdeaState,
    title: string,
    rows: Card[],
    tone: string,
  ) => (
    <section
      className={`ws-lane ws-lane-${tone} ${overLane === key ? "ws-lane-over" : ""}`}
      aria-label={title}
      onDragOver={planner ? (event) => { event.preventDefault(); setOverLane(key); } : undefined}
      onDragLeave={planner ? () => setOverLane((c) => (c === key ? null : c)) : undefined}
      onDrop={planner ? onDrop(key) : undefined}
    >
      <header className="ws-lane-head">
        <h3>{title}</h3>
        <span>{rows.length + (key === "considering" ? inFlight.length : 0)}</span>
      </header>
      {key === "considering" && planner ? <QuickAdd onAdd={add} /> : null}
      <div className="ws-lane-cards">
        {rows.map(card)}
        {key === "considering"
          ? inFlight.map((entry) => (
              <span key={entry.key} className="ws-card ws-card-pending">
                <span className="ws-card-title">{entry.title}</span>
              </span>
            ))
          : null}
        {rows.length === 0 && key === "discuss" ? (
          <p className="ws-lane-empty">Nothing waiting on an answer.</p>
        ) : null}
      </div>
    </section>
  );

  return (
    <>
      <div className="ws-bar">
        <div className="ws-bar-left">
          {failure ? <span className="ws-failure" role="status">{failure}</span> : null}
        </div>
        <div className="ws-bar-right">
          {planned.length > 0 ? (
            <button
              type="button"
              className={`ws-btn-quiet ${needsPlanning.length > 0 ? "ws-btn-attention" : ""}`}
              onClick={() => setShelf("planned")}
            >
              {needsPlanning.length > 0
                ? `Needs planning · ${needsPlanning.length}`
                : `In the plan · ${planned.length}`}
            </button>
          ) : null}
          {aside.length > 0 ? (
            <button type="button" className="ws-btn-quiet" onClick={() => setShelf("aside")}>
              Set aside · {aside.length}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ws-lanes">
        {lane("considering", "Ideas", considering, "plain")}
        {lane("discuss", "Needs decision", deciding, "warm")}
      </div>

      {shownShelf ? (
        <Panel
          title={shownShelf === "aside" ? "Set aside" : "Needs planning"}
          onClose={() => setShelf(null)}
        >
          {shownShelf === "planned" ? (
            <div className="ws-shelf-filter" role="group" aria-label="Show">
              <button type="button" aria-pressed={onlyGaps} onClick={() => setOnlyGaps(true)}>
                Still needs something · {needsPlanning.length}
              </button>
              <button type="button" aria-pressed={!onlyGaps} onClick={() => setOnlyGaps(false)}>
                All in the plan · {planned.length}
              </button>
            </div>
          ) : null}

          {(shownShelf === "aside"
            ? aside
            : onlyGaps
              ? needsPlanning
              : planned
          ).map((idea) => (
            <div key={idea.id} className="ws-shelf-row">
              <button
                type="button"
                className="ws-shelf-open"
                onClick={() => { setOpenId(idea.id); setShelf(null); }}
              >
                {idea.title}
              </button>
              {idea.decision ? <p className="ws-note">{idea.decision}</p> : null}
              {shownShelf === "planned" ? (
                <span className="ws-card-meta">
                  {[...new Set(idea.links.map((l) => l.kind))].map((kind) => (
                    <em key={kind} className="ws-chip ws-chip-mark">{MARK[kind] ?? kind}</em>
                  ))}
                  {gapsOf(idea).map((gap) => (
                    <em key={gap} className="ws-chip ws-chip-gap">{gap}</em>
                  ))}
                </span>
              ) : null}
              {shownShelf === "aside" && planner ? (
                <button
                  type="button"
                  className="ws-btn-quiet"
                  onClick={() => { move(idea, "considering"); setShelf(null); }}
                >
                  Bring back
                </button>
              ) : null}
            </div>
          ))}

          {shownShelf === "planned" && onlyGaps && needsPlanning.length === 0 ? (
            <p className="ws-lane-empty">
              Everything in the plan has a time and an owner. Nothing is waiting.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {open ? (
        <IdeaPanel
          idea={open}
          route={route}
          planner={planner}
          onClose={() => setOpenId(null)}
          onMove={move}
          onPlace={place}
          onDeleted={(id) => {
            setRemoved((prev) => new Set(prev).add(id));
            setOpenId(null);
          }}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------- one line, one idea */

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="ws-quickadd"
      onSubmit={(event) => {
        event.preventDefault();
        const title = value.trim();
        if (!title) return;
        setValue("");
        onAdd(title);
      }}
    >
      <input
        value={value}
        placeholder="Add an idea"
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
      />
    </form>
  );
}

/* ------------------------------------------------------------- panels */

export function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-panel-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-panel">
        <header className="ws-panel-head">
          <p className="ws-panel-kicker">{title}</p>
          <button type="button" className="ws-x" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="ws-panel-body">{children}</div>
      </div>
    </div>
  );
}

function IdeaPanel({
  idea,
  route,
  planner,
  onClose,
  onMove,
  onPlace,
  onDeleted,
}: {
  idea: Idea & { state: IdeaState };
  route: Route;
  planner: boolean;
  onClose: () => void;
  onMove: (idea: Idea & { state: IdeaState }, state: IdeaState, reason?: string) => void;
  onPlace: (idea: Idea & { state: IdeaState }, day: string | null, daypart: string | null) => void;
  onDeleted: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState(idea.detail ?? "");
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* Deleting orphans rather than destroys: the foreign keys are SET NULL, so
     whatever the idea became outlives it. Say so before the button. */
  const survives = [...new Set(idea.links.map((link) => link.kind.toLowerCase()))];

  const decided = idea.state === "planned";

  return (
    <Panel title={idea.state === "discuss" ? "Needs decision" : "Idea"} onClose={onClose}>
      <h3 className="ws-panel-title">{idea.title}</h3>

      {planner ? (
        <textarea
          className="ws-detail"
          value={detail}
          rows={2}
          maxLength={600}
          placeholder="Add detail, if it helps"
          onChange={(event) => setDetail(event.target.value)}
          onBlur={() => {
            if ((idea.detail ?? "") === detail) return;
            startTransition(async () => {
              await describeIdea(route.clientSlug, route.eventSlug, route.edition, idea.id, detail);
            });
          }}
        />
      ) : idea.detail ? (
        <p className="ws-note">{idea.detail}</p>
      ) : null}

      {planner ? (
        <>
          <div className="ws-decide" role="group" aria-label="Decide">
            <button
              type="button"
              className="ws-decide-yes"
              aria-pressed={decided}
              onClick={() => onMove(idea, "planned")}
            >
              Yes, use it
            </button>
            <button
              type="button"
              className="ws-decide-wait"
              aria-pressed={idea.state === "discuss"}
              onClick={() => onMove(idea, "discuss")}
            >
              Needs answer
            </button>
            <button
              type="button"
              className="ws-decide-no"
              onClick={() => onMove(idea, "aside")}
            >
              Not now
            </button>
          </div>

          <div className="ws-seg" role="group" aria-label="Where it might fit">
            <select
              value={idea.day ?? ""}
              onChange={(event) =>
                onPlace(idea, event.target.value || null, event.target.value ? idea.daypart : null)
              }
            >
              <option value="">No day yet</option>
              {DAYS.map((day) => <option key={day.key} value={day.key}>{day.label}</option>)}
            </select>
            {idea.day ? (
              <select
                value={idea.daypart ?? "anytime"}
                onChange={(event) => onPlace(idea, idea.day, event.target.value)}
              >
                {DAYPARTS.map((part) => (
                  <option key={part.key} value={part.key}>{part.label}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="ws-panel-section">
            <p className="ws-panel-sub">What does it need?</p>
            <AddToPlan
              route={route}
              ideaId={idea.id}
              ideaTitle={idea.title}
              day={idea.day}
              daypart={idea.daypart}
              costDollars={idea.costDollars}
              done={[
                ...(idea.links.some((l) => l.kind === "Schedule") ? (["time"] as const) : []),
                ...(idea.links.some((l) => l.kind === "Action") ? (["action"] as const) : []),
                ...(idea.costDollars !== null ? (["cost"] as const) : []),
                ...(idea.links.some((l) => l.kind === "Need") ? (["need"] as const) : []),
              ]}
            />
          </div>
        </>
      ) : null}

      {idea.links.length > 0 ? (
        <div className="ws-panel-section">
          <p className="ws-panel-sub">In the plan</p>
          {idea.links.map((link, index) => (
            <Link key={index} className="ws-link" href={link.href}>
              <b>{link.kind}</b> {link.label}
            </Link>
          ))}
        </div>
      ) : null}

      {planner ? (
        <div className="ws-panel-section ws-danger">
          {confirming ? (
            <>
              <p className="ws-note">
                {survives.length > 0
                  ? `Delete this idea? The ${survives.join(" and ")} it created will stay, no longer linked to any idea.`
                  : "Delete this idea? Its notes go with it."}
              </p>
              <div className="ws-danger-row">
                <button
                  type="button"
                  className="ws-btn-danger"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const outcome = await deleteIdea(
                        route.clientSlug, route.eventSlug, route.edition, idea.id,
                      );
                      if (outcome.ok) onDeleted(idea.id);
                      else setFailed(outcome.message ?? "That did not delete.");
                    })
                  }
                >
                  Delete it
                </button>
                <button type="button" className="ws-btn-quiet" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </div>
              {failed ? <p className="ws-msg" role="status">{failed}</p> : null}
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
            {entry.body}
            <span>{entry.author ?? ""} · {entry.at}</span>
          </p>
        ))}
        <form
          className="ws-noteform"
          action={() =>
            startTransition(async () => {
              if (!note.trim()) return;
              const body = note;
              setNote("");
              await addIdeaNote(route.clientSlug, route.eventSlug, route.edition, idea.id, body);
            })
          }
        >
          <input
            value={note}
            maxLength={1000}
            placeholder="Add a note"
            onChange={(event) => setNote(event.target.value)}
          />
          <button type="submit" className="ws-btn-quiet" disabled={pending || !note.trim()}>
            Add
          </button>
        </form>
      </div>
    </Panel>
  );
}
