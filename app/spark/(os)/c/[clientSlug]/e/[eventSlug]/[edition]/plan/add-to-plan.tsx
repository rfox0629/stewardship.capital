"use client";

import { useState, useTransition } from "react";

import { addToPlan, type PlanDestination } from "./actions";

/**
 * What should come of this idea?
 *
 * Three answers, none required, any combination allowed. Every field arrives
 * filled in from the idea, so the thing that has already been said once is
 * never typed again. A schedule moment will take a real time, but it will
 * also take "Saturday evening" and wait for the rest.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

const DESTINATIONS: Array<{ key: PlanDestination; label: string; hint: string }> = [
  { key: "schedule", label: "Schedule", hint: "It happens at the event" },
  { key: "action", label: "Action", hint: "Someone does something" },
  { key: "need", label: "Need", hint: "Something is needed" },
];

const DAYS = [
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DAYPARTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "anytime", label: "Anytime" },
];

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];

const KINDS = [
  { key: "person", label: "Person" },
  { key: "vendor", label: "Vendor" },
  { key: "equipment", label: "Equipment" },
  { key: "supply", label: "Supply" },
  { key: "deliverable", label: "Deliverable" },
];

export function AddToPlan({
  route,
  ideaId,
  ideaTitle,
  day,
  daypart,
  onDone,
}: {
  route: Route;
  ideaId: string;
  ideaTitle: string;
  day: string | null;
  daypart: string | null;
  onDone?: () => void;
}) {
  const [destination, setDestination] = useState<PlanDestination | null>(null);
  const [added, setAdded] = useState<PlanDestination[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!destination) {
    return (
      <div className="ws-dests">
        {DESTINATIONS.map((dest) => (
          <button
            key={dest.key}
            type="button"
            className="ws-dest"
            onClick={() => { setDestination(dest.key); setMessage(null); }}
          >
            <b>{dest.label}</b>
            <span>{added.includes(dest.key) ? "Added" : dest.hint}</span>
          </button>
        ))}
      </div>
    );
  }

  const field = (label: string, input: React.ReactNode) => (
    <label className="ws-field">
      <span>{label}</span>
      {input}
    </label>
  );

  return (
    <form
      className="ws-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await addToPlan(
            route.clientSlug, route.eventSlug, route.edition, ideaId, destination, formData,
          );
          if (outcome.ok) {
            setAdded((prev) => [...prev, destination]);
            setDestination(null);
            onDone?.();
          } else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      {field("Title", <input name="title" defaultValue={ideaTitle} maxLength={200} />)}

      {destination === "schedule" ? (
        <>
          <div className="ws-form-row">
            {field("Day", (
              <select name="day" defaultValue={day ?? "sat"}>
                {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            ))}
            {field("Starts", <input name="starts" placeholder="2:00 pm" />)}
            {field("Ends", <input name="ends" placeholder="2:45 pm" />)}
          </div>
          <div className="ws-form-row">
            {field("Or just", (
              <select name="daypart" defaultValue={daypart ?? "afternoon"}>
                {DAYPARTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            ))}
            {field("Track", (
              <select name="track" defaultValue="Experience">
                {TRACKS.map((track) => <option key={track}>{track}</option>)}
              </select>
            ))}
            {field("Where", <input name="location" maxLength={120} />)}
          </div>
          <p className="ws-hint">Leave the time empty and it sits in that part of the day.</p>
        </>
      ) : null}

      {destination === "action" ? (
        <div className="ws-form-row">
          {field("Owner", <input name="owner" maxLength={80} placeholder="Who" />)}
          {field("Due", <input name="due" type="date" />)}
          {field("Cost", <input name="cost" inputMode="decimal" placeholder="0" />)}
        </div>
      ) : null}

      {destination === "need" ? (
        <div className="ws-form-row">
          {field("Kind", (
            <select name="kind" defaultValue="supply">
              {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          ))}
          {field("Who has it", <input name="owner" maxLength={80} />)}
          {field("Cost", <input name="cost" inputMode="decimal" placeholder="0" />)}
        </div>
      ) : null}

      <div className="ws-form-actions">
        <button type="submit" className="ws-btn" disabled={pending}>
          {pending ? "Adding" : "Add"}
        </button>
        <button type="button" className="ws-btn-quiet" disabled={pending} onClick={() => setDestination(null)}>
          Back
        </button>
      </div>
      {message ? <p className="ws-msg" role="status">{message}</p> : null}
    </form>
  );
}
