"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import type { EngagementReference } from "@lib/spark/engagement";
import { ideaFromReference } from "./actions";

/**
 * The material the weekend rests on, one button away from the plan.
 *
 * Three collections: the programme concepts, what the property has, and the
 * drinks nobody has chosen between yet. This used to be three large doors on
 * a page of its own, which made reading reference feel like a stage of the
 * work. It is not a stage. It is what somebody reaches for mid sentence.
 *
 * Nothing here becomes part of the weekend by being read. Every row carries
 * one button, and that button makes an idea, which is the only way in:
 * resource, then idea, then calendar. An amenity can also become an activity
 * inside a moment, which is the same rule reached from the other end.
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

export function Resources({
  reference,
  route,
  planner = true,
}: {
  reference: EngagementReference;
  route: Route;
  planner?: boolean;
}) {
  const hydrated = useHydrated();
  const [listing, setListing] = useState(false);
  const [open, setOpen] = useState<Door>(wantedDoor);
  const shown = hydrated ? open : null;

  const vision = reference.vision;
  const venue = reference.venue;
  const drinks = reference.drinks;

  const doors: Array<{
    key: Exclude<Door, null>;
    kicker: string;
    title: string;
    sub: string;
    count: string;
  }> = [];
  if (vision) {
    doors.push({
      key: "vision",
      kicker: "Program",
      title: vision.theme ?? "Vision",
      sub: vision.scripture ?? "",
      count: `${vision.elements?.length ?? 0} concepts`,
    });
  }
  if (venue) {
    doors.push({
      key: "venue",
      kicker: "Venue",
      title: venue.name ?? "Venue",
      sub: venue.takeaway ?? "",
      count: `${venue.amenities?.length ?? 0} amenities`,
    });
  }
  if (drinks) {
    doors.push({
      key: "drinks",
      kicker: "Drinks",
      title: "Signature drink",
      sub: "Nothing chosen yet",
      count: `${drinks.options?.length ?? 0} concepts`,
    });
  }

  if (doors.length === 0) return null;

  return (
    <>
      <button type="button" className="ev-bar-quiet" aria-expanded={listing}
        onClick={() => setListing((was) => !was)}>
        Resources
      </button>

      {listing ? (
        <Sheet title="Planning resources" onClose={() => setListing(false)}>
          <p className="ws-hint">
            What the weekend rests on. Reading any of it changes nothing; making an idea
            from a row is the decision, and the idea is where it joins the plan.
          </p>
          <div className="ws-resource-list">
            {doors.map((door) => (
              <button key={door.key} type="button" className="ws-resource"
                onClick={() => { setListing(false); setOpen(door.key); }}>
                <b>{door.kicker}</b>
                <span>{door.title}</span>
                {door.sub ? <em>{door.sub}</em> : null}
                <i>{door.count}</i>
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}

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
  label = "+ Idea",
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
              />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
