"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { addIdea, placeIdea } from "./actions";
import { AddIdea } from "./add-idea";
import { toIdeaState, type IdeaState } from "./idea-state";
import { IdeaPanel } from "./idea-panel";

/**
 * The workbench.
 *
 * Everything under consideration, laid out the way the weekend runs, and
 * loose enough to pick up. A card is dragged from one day to another and the
 * movement is the edit: no drawer, no form, no save. Placement is a guess
 * about where something belongs, never a time, so nothing here creates a
 * scheduled moment. That happens on the Weekend, by dropping an idea onto
 * an actual hour.
 *
 * Dragging is never the only way. The same move exists as a plain control
 * inside the idea, which is what a keyboard and a phone use.
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

/* A drop zone is addressed by the placement it means. Unplaced is a real
   answer, so it gets a name of its own rather than an empty string. */
const UNPLACED = "unplaced";
const zoneToDay = (zone: string) => (zone === UNPLACED ? null : zone);

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
  /* A link from the Weekend can ask for the scheduling sheet directly, so
     one scheduling engine serves both the drag and the click. */
  const [openSheet, setOpenSheet] = useState<"schedule" | null>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("sheet") === "schedule" ? "schedule" : null);
  const [lens, setLens] = useState<Lens>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("show") === "question" ? "question" : "open");
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState<Array<{ key: string; title: string; day: string | null }>>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  /* A moved card holds its new column while the server catches up. Each
     entry remembers every column the card has passed through, which is what
     lets it expire on its own: while the server still reports one of those,
     the move is in flight; the moment it reports anything else it has either
     accepted the move or somebody else has moved the card, and either way
     the server is now the better answer. No effect, no cleanup pass. */
  const [moved, setMoved] = useState<Map<string, { was: Array<string | null>; to: string | null }>>(
    new Map());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);
  /* True while there are columns off the right edge to scroll to. Measured
     from the element itself rather than guessed from a breakpoint. */
  const [more, setMore] = useState(false);
  const measure = (el: HTMLDivElement | null) => {
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
  };
  const [, startTransition] = useTransition();

  const live = ideas
    .filter((idea) => !removed.has(idea.id))
    .map((idea) => {
      const over = moved.get(idea.id);
      return over && over.was.includes(idea.day) ? { ...idea, day: over.to } : idea;
    });
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

  /* The movement is the edit. The card lands first and the row follows; if
     the row refuses, the card goes back where it came from and says so. */
  const move = (id: string, day: string | null) => {
    const idea = live.find((entry) => entry.id === id);
    if (!idea || !planner) return;
    if ((idea.day ?? null) === day) return;

    setMoved((prev) => {
      const before = prev.get(id);
      /* Moving a card twice before the first move lands: both columns it
         passed through still count as in flight. */
      const was = before ? [...before.was, before.to] : [idea.day ?? null];
      return new Map(prev).set(id, { was, to: day });
    });
    setFailure(null);
    startTransition(async () => {
      const outcome = await placeIdea(
        route.clientSlug, route.eventSlug, route.edition, id, day, day ? idea.daypart : null);
      if (!outcome.ok) {
        setMoved((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        setFailure("That move did not save, so the card went back.");
      }
    });
  };

  const opened = hydrated ? live.find((idea) => idea.id === openId) ?? null : null;

  const closePanel = () => { setOpenId(null); setOpenSheet(null); };

  /* Everything a zone needs to accept a card. Held in one place so the two
     trays and the five columns behave identically. */
  const zone = (key: string) =>
    !planner || !hydrated
      ? {}
      : {
          onDragOver: (event: React.DragEvent) => {
            if (!dragId) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (overZone !== key) setOverZone(key);
          },
          onDragLeave: (event: React.DragEvent) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setOverZone((current) => (current === key ? null : current));
          },
          onDrop: (event: React.DragEvent) => {
            event.preventDefault();
            const id = dragId;
            setOverZone(null);
            setDragId(null);
            if (id) move(id, zoneToDay(key));
          },
        };

  const card = (idea: Idea) => {
    const cost = idea.costs.reduce((sum, row) => sum + row.cents, 0);
    const at = idea.schedule.find((row) => row.at)?.at ?? null;
    const marks: React.ReactNode[] = [];
    if (idea.question) marks.push(<em key="q" className="ws-mark ws-mark-q">Needs answer</em>);
    if (at) marks.push(<em key="at" className="ws-mark ws-mark-when">{at}</em>);
    else if (idea.schedule.length > 0) marks.push(<em key="s" className="ws-mark ws-mark-when">Scheduled</em>);
    if (idea.schedule.length > 1) {
      marks.push(<em key="n" className="ws-mark ws-mark-when">×{idea.schedule.length}</em>);
    }
    if (idea.inMoments.length > 0) marks.push(<em key="m" className="ws-mark ws-mark-when">In run of show</em>);
    if (idea.actions.length > 0) {
      marks.push(<em key="a" className="ws-mark">{idea.actions.length} action{idea.actions.length === 1 ? "" : "s"}</em>);
    }
    if (idea.requirements.length > 0) marks.push(<em key="r" className="ws-mark">{idea.requirements.length} req</em>);
    if (cost > 0) marks.push(<em key="c" className="ws-mark">{money(cost)}</em>);
    if (idea.answer) marks.push(<em key="d" className="ws-mark ws-mark-ok">Decided</em>);

    const grabbable = planner && hydrated;

    return (
      <button key={idea.id} type="button"
        className={`ws-idea ${idea.question ? "ws-idea-q" : ""} ${grabbable ? "ws-idea-grab" : ""} ${
          dragId === idea.id ? "ws-idea-lift" : ""}`}
        draggable={grabbable}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", idea.id);
          event.dataTransfer.effectAllowed = "move";
          setDragId(idea.id);
        }}
        onDragEnd={() => { setDragId(null); setOverZone(null); }}
        onClick={() => setOpenId(idea.id)}>
        <span className="ws-idea-title">{idea.title}</span>
        {marks.length > 0 ? <span className="ws-idea-marks">{marks}</span> : null}
      </button>
    );
  };

  const flightFor = (key: string | null) =>
    inFlight.filter((entry) => (entry.day ?? null) === key);

  /* A tray is absent when it is empty, because an empty tray is a question
     nobody asked. While a card is in the air it appears anyway: you cannot
     drop something into a place that is not there. */
  const showUnplaced = unplaced.length > 0 || flightFor(null).length > 0 || dragId !== null;
  const showWide = eventWide.length > 0 || flightFor("all").length > 0 || dragId !== null;

  return (
    <>
      <div className="ws-plan-top">
        <div className="ws-plan-titles">
          <h2 className="ws-title">Plan</h2>
          {tabs}
        </div>
        {planner ? (
          <div className="ws-plan-tools">
            <button type="button" className="ws-add-btn" onClick={() => setAdding(true)}>
              <span aria-hidden="true">+</span> Add idea
            </button>
            <div className="ws-menu">
              <button type="button" className="ws-menu-btn" aria-label="Views"
                aria-expanded={menu} onClick={() => setMenu((v) => !v)}>•••</button>
              {menu ? (
                <div className="ws-menu-list" role="menu">
                  <button type="button" role="menuitem"
                    onClick={() => { setMenu(false); setLens(shownLens === "question" ? "open" : "question"); }}>
                    {shownLens === "question" ? "Show everything" : `Only what needs an answer (${withQuestion.length})`}
                  </button>
                  <button type="button" role="menuitem"
                    onClick={() => { setMenu(false); setLens(shownLens === "aside" ? "open" : "aside"); }}>
                    {shownLens === "aside" ? "Back to the plan" : `View set aside (${aside.length})`}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {shownLens !== "open" ? (
        <p className="ws-filtered" role="status">
          {shownLens === "question" ? "Showing only ideas with an open question" : "Showing ideas set aside"}
          <button type="button" onClick={() => setLens("open")}>Show everything</button>
        </p>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}

      {showUnplaced ? (
        <section
          className={`ws-tray ws-tray-unplaced ${overZone === UNPLACED ? "ws-zone-on" : ""}`}
          aria-label="Unplaced ideas" {...zone(UNPLACED)}>
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
            {unplaced.length === 0 && flightFor(null).length === 0 ? (
              <p className="ws-zone-hint">Drop here to unplace</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showWide ? (
        <section
          className={`ws-tray ws-tray-wide ${overZone === "all" ? "ws-zone-on" : ""}`}
          aria-label="Event-wide ideas" {...zone("all")}>
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
            {eventWide.length === 0 && flightFor("all").length === 0 ? (
              <p className="ws-zone-hint">Drop here for the whole event</p>
            ) : null}
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

      <div
        className="ws-board-scroll"
        ref={measure}
        onScroll={(event) => measure(event.currentTarget)}
      >
        {more ? <span className="ws-board-fade" aria-hidden="true" /> : null}
        <div className="ws-board">
        {DAYS.map((d) => {
          const rows = pool.filter((idea) => idea.day === d.key);
          const flight = flightFor(d.key);
          return (
            <section key={d.key}
              className={`ws-col ${shownMobileDay === d.key ? "ws-col-active" : ""} ${
                overZone === d.key ? "ws-zone-on" : ""}`}
              aria-label={d.label} {...zone(d.key)}>
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
                  <p className="ws-col-empty">{dragId ? "Drop here" : "Nothing yet"}</p>
                ) : null}
              </div>
            </section>
          );
        })}
        </div>
      </div>

      {adding ? <AddIdea onAdd={add} onClose={() => setAdding(false)} /> : null}

      {opened ? (
        <IdeaPanel idea={opened} route={route} planner={planner} moments={moments}
          initialSheet={openSheet}
          onClose={closePanel}
          onPlace={(day) => move(opened.id, day)}
          onDeleted={(id) => { setRemoved((prev) => new Set(prev).add(id)); closePanel(); }} />
      ) : null}
    </>
  );
}

export { toIdeaState };
