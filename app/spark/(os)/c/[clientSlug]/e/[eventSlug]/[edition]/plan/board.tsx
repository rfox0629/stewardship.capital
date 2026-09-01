"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import {
  addIdea,
  addIdeaNote,
  describeIdea,
  placeIdea,
  setIdeaState,
} from "./actions";
import { toIdeaState, type IdeaState } from "./idea-state";
import { AddToPlan } from "./add-to-plan";

/**
 * The ideas, in the shape of the weekend.
 *
 * This is the working sheet made interactive: a column per day, one card per
 * idea, and a tray for everything not yet spoken for. The question it answers
 * at a glance is the one the team actually asks, which day are we thinking
 * about this, and it answers it without anyone having to open a thing.
 *
 * An idea is added with one line of typing at the head of any column, and it
 * lands in that day. Dragging moves it between days; a card can also be moved
 * from its own panel, because a phone has no drag.
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
  links: Array<{ kind: string; label: string; href: string }>;
  notes: Array<{ author: string | null; body: string; at: string }>;
};

const DAYS: Array<{ key: string; label: string; short: string }> = [
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

const STATE_LABEL: Record<IdeaState, string> = {
  considering: "Considering",
  discuss: "Discuss",
  planned: "In the plan",
  aside: "Set aside",
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
  const [showAside, setShowAside] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const merged = useMemo(
    () =>
      ideas.map((idea) => {
        const placed = placeOverride.get(idea.id);
        return {
          ...idea,
          state: stateOverride.get(idea.id) ?? toIdeaState(idea.status),
          day: placed ? placed.day : idea.day,
          daypart: placed ? placed.daypart : idea.daypart,
        };
      }),
    [ideas, stateOverride, placeOverride],
  );

  type Card = (typeof merged)[number];

  const place = (idea: Card, day: string | null, daypart: string | null) => {
    setPlaceOverride((prev) => new Map(prev).set(idea.id, { day, daypart }));
    setFailure(null);
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
        setFailure("That move did not save, so the card went back.");
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

  const onDropDay = (day: string | null) => (event: React.DragEvent) => {
    event.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const idea = merged.find((candidate) => candidate.id === id);
    if (idea) place(idea, day, day ? idea.daypart : null);
  };

  const live = merged.filter((idea) => idea.state !== "aside");
  const aside = merged.filter((idea) => idea.state === "aside");
  const unplaced = live.filter((idea) => !idea.day);
  const open = hydrated ? merged.find((idea) => idea.id === openId) ?? null : null;

  const card = (idea: Card) => (
    <button
      key={idea.id}
      type="button"
      className={`ws-card ws-card-${idea.state}`}
      draggable={planner}
      onDragStart={() => { dragId.current = idea.id; }}
      onClick={() => setOpenId(idea.id)}
    >
      <span className="ws-card-title">{idea.title}</span>
      <span className="ws-card-meta">
        {idea.state === "discuss" ? <em className="ws-tag ws-tag-discuss">Discuss</em> : null}
        {idea.state === "planned" ? <em className="ws-tag ws-tag-planned">In the plan</em> : null}
        {idea.daypart && idea.daypart !== "anytime" ? (
          <em className="ws-tag">{idea.daypart}</em>
        ) : null}
        {idea.notes.length > 0 ? <em className="ws-tag">{idea.notes.length} note</em> : null}
      </span>
    </button>
  );

  return (
    <>
      <div className="ws-bar">
        <div className="ws-bar-left">
          <span className="ws-count">{live.length} ideas</span>
          {live.filter((i) => i.state === "discuss").length > 0 ? (
            <span className="ws-count ws-count-discuss">
              {live.filter((i) => i.state === "discuss").length} to discuss
            </span>
          ) : null}
        </div>
        <div className="ws-bar-right">
          {failure ? <span className="ws-failure" role="status">{failure}</span> : null}
          {aside.length > 0 ? (
            <button type="button" className="ws-btn-quiet" onClick={() => setShowAside(true)}>
              Set aside · {aside.length}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ws-days">
        {DAYS.map((day) => {
          const mine = live.filter((idea) => idea.day === day.key);
          return (
            <section
              key={day.key}
              className="ws-day"
              aria-label={day.label}
              onDragOver={planner ? (event) => event.preventDefault() : undefined}
              onDrop={planner ? onDropDay(day.key) : undefined}
            >
              <header className="ws-day-head">
                <h3>{day.label}</h3>
                <span>{mine.length}</span>
              </header>
              {planner ? <QuickAdd route={route} day={day.key} /> : null}
              <div className="ws-day-cards">{mine.map(card)}</div>
            </section>
          );
        })}
      </div>

      <section
        className="ws-tray"
        aria-label="Unscheduled ideas"
        onDragOver={planner ? (event) => event.preventDefault() : undefined}
        onDrop={planner ? onDropDay(null) : undefined}
      >
        <header className="ws-day-head">
          <h3>Unscheduled</h3>
          <span>{unplaced.length}</span>
        </header>
        {planner ? <QuickAdd route={route} day={null} /> : null}
        <div className="ws-tray-cards">{unplaced.map(card)}</div>
      </section>

      {showAside ? (
        <Panel title="Set aside" onClose={() => setShowAside(false)}>
          {aside.map((idea) => (
            <div key={idea.id} className="ws-aside-row">
              <p className="ws-card-title">{idea.title}</p>
              {idea.decision ? <p className="ws-note">{idea.decision}</p> : null}
              {idea.decidedBy ? <p className="ws-sub">{idea.decidedBy}</p> : null}
              {planner ? (
                <button
                  type="button"
                  className="ws-btn-quiet"
                  onClick={() => { move(idea, "considering"); setShowAside(false); }}
                >
                  Bring back
                </button>
              ) : null}
            </div>
          ))}
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
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------- one line, one idea */

function QuickAdd({ route, day }: { route: Route; day: string | null }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="ws-quickadd"
      action={() =>
        startTransition(async () => {
          const title = value.trim();
          if (!title) return;
          setValue("");
          await addIdea(route.clientSlug, route.eventSlug, route.edition, title, { day });
        })
      }
    >
      <input
        value={value}
        placeholder="Add an idea"
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
        disabled={pending}
      />
    </form>
  );
}

/* ------------------------------------------------------------- panels */

function Panel({
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
}: {
  idea: Idea & { state: IdeaState };
  route: Route;
  planner: boolean;
  onClose: () => void;
  onMove: (idea: Idea & { state: IdeaState }, state: IdeaState, reason?: string) => void;
  onPlace: (idea: Idea & { state: IdeaState }, day: string | null, daypart: string | null) => void;
}) {
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState(idea.detail ?? "");
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Panel title={STATE_LABEL[idea.state]} onClose={onClose}>
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
          <div className="ws-seg" role="group" aria-label="Where it might fit">
            <select
              value={idea.day ?? ""}
              onChange={(event) =>
                onPlace(idea, event.target.value || null, event.target.value ? idea.daypart : null)
              }
            >
              <option value="">Unscheduled</option>
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

          <div className="ws-states" role="group" aria-label="State">
            {(["considering", "discuss", "aside"] as IdeaState[]).map((state) => (
              <button
                key={state}
                type="button"
                className={idea.state === state ? "ws-state-on" : ""}
                onClick={() => onMove(idea, state)}
              >
                {STATE_LABEL[state]}
              </button>
            ))}
          </div>

          <div className="ws-panel-section">
            <p className="ws-panel-sub">Add to plan</p>
            {adding || idea.links.length === 0 ? (
              <AddToPlan
                route={route}
                ideaId={idea.id}
                ideaTitle={idea.title}
                day={idea.day}
                daypart={idea.daypart}
              />
            ) : (
              <button type="button" className="ws-btn" onClick={() => setAdding(true)}>
                Add something else
              </button>
            )}
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
