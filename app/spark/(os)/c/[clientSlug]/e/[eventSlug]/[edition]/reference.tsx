"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import type { EngagementReference } from "@lib/spark/engagement";
import { ideaFromReference } from "./plan/actions";

/**
 * The material the weekend rests on, underneath the plan rather than on top
 * of it.
 *
 * Three quiet doors. Closed, each is a line and a count. Opened, the sheet is
 * all there. Nothing here is a task or an idea until a person says so, which
 * is what the one button on each row is for: reference becomes an idea by a
 * decision, never by being read.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };
type Door = "vision" | "venue" | "drinks" | null;

/* A door can be linked to, so a meeting can open one from an agenda. */
const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const wantedDoor = (): Door => {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("ref");
  return value === "vision" || value === "venue" || value === "drinks" ? value : null;
};

export function Reference({
  reference,
  route,
  planner,
}: {
  reference: EngagementReference;
  route: Route;
  planner: boolean;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState<Door>(wantedDoor);
  const shown = hydrated ? open : null;

  const vision = reference.vision;
  const venue = reference.venue;
  const drinks = reference.drinks;

  const doors: Array<{ key: Exclude<Door, null>; title: string; sub: string; count: string }> = [];
  if (vision) {
    doors.push({
      key: "vision",
      title: vision.theme ?? "Vision",
      sub: vision.scripture ?? "",
      count: `${vision.elements?.length ?? 0} concepts`,
    });
  }
  if (venue) {
    doors.push({
      key: "venue",
      title: venue.name ?? "Venue",
      sub: venue.takeaway ?? "",
      count: `${venue.amenities?.length ?? 0} amenities`,
    });
  }
  if (drinks) {
    doors.push({
      key: "drinks",
      title: "Signature drink",
      sub: "Nothing chosen yet",
      count: `${drinks.options?.length ?? 0} concepts`,
    });
  }

  if (doors.length === 0) return null;

  return (
    <>
      <div className="wk-doors">
        {doors.map((door) => (
          <button key={door.key} type="button" className="wk-door" onClick={() => setOpen(door.key)}>
            <b>{door.title}</b>
            {door.sub ? <span>{door.sub}</span> : null}
            <em>{door.count}</em>
          </button>
        ))}
      </div>

      {shown === "vision" && vision ? (
        <Sheet title={vision.theme ?? "Vision"} onClose={() => setOpen(null)}>
          <VisionSheet vision={vision} route={route} planner={planner} />
        </Sheet>
      ) : null}

      {shown === "venue" && venue ? (
        <Sheet title={venue.name ?? "Venue"} onClose={() => setOpen(null)}>
          <VenueSheet venue={venue} route={route} planner={planner} />
        </Sheet>
      ) : null}

      {shown === "drinks" && drinks ? (
        <Sheet title="Signature drink" onClose={() => setOpen(null)}>
          <DrinkSheet drinks={drinks} route={route} planner={planner} />
        </Sheet>
      ) : null}
    </>
  );
}

function Sheet({
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
      <div className="ws-panel ws-panel-wide">
        <header className="ws-panel-head">
          <p className="ws-panel-kicker">{title}</p>
          <button type="button" className="ws-x" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="ws-panel-body">{children}</div>
      </div>
    </div>
  );
}

/** One button, used by all three sheets, that turns a thing into an idea. */
function MakeIdea({
  route,
  title,
  detail,
  label = "Make idea",
}: {
  route: Route;
  title: string;
  detail?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "already">("idle");
  const [pending, startTransition] = useTransition();

  if (state !== "idle") {
    return <span className="wk-made">{state === "done" ? "Added to ideas" : "Already an idea"}</span>;
  }

  return (
    <button
      type="button"
      className="ws-btn-quiet wk-make"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const outcome = await ideaFromReference(
            route.clientSlug, route.eventSlug, route.edition, title, detail,
          );
          setState(outcome.ok ? "done" : "already");
        })
      }
    >
      {label}
    </button>
  );
}

function VisionSheet({
  vision,
  route,
  planner,
}: {
  vision: NonNullable<EngagementReference["vision"]>;
  route: Route;
  planner: boolean;
}) {
  const [openName, setOpenName] = useState<string | null>(null);

  return (
    <>
      {vision.passage ? <p className="wk-passage">{vision.passage}</p> : null}
      {vision.connection ? <p className="wk-body">{vision.connection}</p> : null}

      <div className="wk-concepts">
        {(vision.elements ?? []).map((element) => {
          const isOpen = openName === element.name;
          return (
            <div key={element.name} className={`wk-concept ${isOpen ? "wk-concept-open" : ""}`}>
              <button
                type="button"
                className="wk-concept-head"
                aria-expanded={isOpen}
                onClick={() => setOpenName(isOpen ? null : element.name)}
              >
                <b>{element.name}</b>
                {element.scripture ? <span>{element.scripture}</span> : null}
                <em>{isOpen ? "Close" : "Explore"}</em>
              </button>
              {isOpen ? (
                <div className="wk-concept-body">
                  {element.passage ? <p className="wk-passage">{element.passage}</p> : null}
                  {element.connection ? <p className="wk-body">{element.connection}</p> : null}
                  {element.practical ? (
                    <p className="wk-practical"><b>Practical</b> {element.practical}</p>
                  ) : null}
                  {planner ? (
                    <MakeIdea route={route} title={element.name} detail={element.practical} />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function VenueSheet({
  venue,
  route,
  planner,
}: {
  venue: NonNullable<EngagementReference["venue"]>;
  route: Route;
  planner: boolean;
}) {
  const amenities = venue.amenities ?? [];
  const categories = [...new Set(amenities.map((a) => a.category ?? "Other"))];
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter ? amenities.filter((a) => (a.category ?? "Other") === filter) : amenities;

  return (
    <>
      {venue.takeaway ? <p className="wk-takeaway">{venue.takeaway}</p> : null}

      <div className="wk-filters" role="group" aria-label="Filter amenities">
        <button
          type="button"
          aria-pressed={filter === null}
          onClick={() => setFilter(null)}
        >
          All {amenities.length}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={filter === category}
            onClick={() => setFilter(filter === category ? null : category)}
          >
            {category}
          </button>
        ))}
      </div>

      <ul className="wk-amenities">
        {shown.map((amenity) => (
          <li key={amenity.name}>
            <div className="wk-amenity-top">
              <span className="wk-amenity-name">{amenity.name}</span>
              <em
                className={`wk-standing wk-avail-${(amenity.availability ?? "")
                  .replace(/[^a-z]/gi, "")
                  .toLowerCase()}`}
              >
                {amenity.availability}
              </em>
            </div>
            {amenity.confirm && amenity.confirm !== "Available" ? (
              <span className="wk-confirm">{amenity.confirm}</span>
            ) : null}
            {planner ? <MakeIdea route={route} title={amenity.name} label="+ Idea" /> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function DrinkSheet({
  drinks,
  route,
  planner,
}: {
  drinks: NonNullable<EngagementReference["drinks"]>;
  route: Route;
  planner: boolean;
}) {
  return (
    <>
      {drinks.note ? <p className="wk-takeaway">{drinks.note}</p> : null}
      <div className="wk-drinkset">
        {(drinks.options ?? []).map((drink) => (
          <div key={drink.name} className="wk-drink">
            <b>{drink.name}</b>
            {drink.feel ? <em>{drink.feel}</em> : null}
            {drink.ingredients ? <span>{drink.ingredients}</span> : null}
            {planner ? (
              <MakeIdea
                route={route}
                title={`Signature drink: ${drink.name}`}
                detail={[drink.ingredients, drink.feel].filter(Boolean).join(" · ")}
                label="Choose"
              />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
