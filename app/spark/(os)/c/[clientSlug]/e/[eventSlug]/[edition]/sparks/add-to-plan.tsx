"use client";

import { useState, useTransition } from "react";

import { addToPlan, type PlanDestination } from "./actions";

/**
 * Where does this belong in the plan?
 *
 * One approved idea, six possible homes, each a two or three field form
 * prefilled from the spark itself so the idea is never typed twice. Nothing
 * is created automatically: every destination is one deliberate choice, and
 * a spark may be given several homes, one at a time.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

const DESTINATIONS: Array<{ key: PlanDestination; label: string }> = [
  { key: "schedule", label: "Schedule" },
  { key: "task", label: "Task" },
  { key: "budget", label: "Budget" },
  { key: "resource", label: "Resource" },
  { key: "decision", label: "Decision" },
  { key: "run-of-show", label: "Run of show" },
];

const DAYS = [
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];
const CATEGORIES = [
  "Venue and lodging", "Food and beverage", "Program and speakers",
  "Experience", "Production and AV", "Gifts and print", "Travel", "Contingency",
];

export function AddToPlan({
  route,
  sparkId,
  sparkTitle,
  scheduleMoments,
}: {
  route: Route;
  sparkId: string;
  sparkTitle: string;
  scheduleMoments: Array<{ id: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<PlanDestination | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setDestination(null);
    setMessage(null);
  };

  if (!open) {
    return (
      <div className="ev-row-actions">
        <button type="button" onClick={() => setOpen(true)}>
          Add to the plan
        </button>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="ev-plan-chooser">
        <p className="ev-plan-q">Where does this belong in the plan?</p>
        <div className="ev-plan-dests">
          {DESTINATIONS.map((dest) => (
            <button key={dest.key} type="button" onClick={() => setDestination(dest.key)}>
              {dest.label}
            </button>
          ))}
        </div>
        <div className="ev-row-actions">
          <button type="button" className="ev-quiet" onClick={close}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  const field = (label: string, input: React.ReactNode) => (
    <div className="ev-field">
      <label>{label}</label>
      {input}
    </div>
  );

  return (
    <form
      className="ev-plan-chooser"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await addToPlan(
            route.clientSlug,
            route.eventSlug,
            route.edition,
            sparkId,
            destination,
            formData,
          );
          if (outcome.ok) close();
          else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      <p className="ev-plan-q">
        {DESTINATIONS.find((d) => d.key === destination)?.label}, from this spark
      </p>

      {destination !== "run-of-show" && destination !== "decision"
        ? field("Title", <input name="title" defaultValue={sparkTitle} maxLength={160} />)
        : null}

      {destination === "schedule" ? (
        <div className="ev-form-grid">
          {field("Day", (
            <select name="day" defaultValue="sat">
              {DAYS.map((day) => (
                <option key={day.key} value={day.key}>{day.label}</option>
              ))}
            </select>
          ))}
          {field("Starts", <input name="starts" placeholder="8:45 pm" required />)}
          {field("Track", (
            <select name="track" defaultValue="Experience">
              {TRACKS.map((track) => <option key={track}>{track}</option>)}
            </select>
          ))}
        </div>
      ) : null}
      {destination === "schedule"
        ? field("Where", <input name="location" maxLength={120} />)
        : null}

      {destination === "task" ? (
        <div className="ev-form-grid">
          {field("Carried by", <input name="owner" maxLength={80} />)}
          {field("Due", <input name="due" type="date" />)}
          {field("Area", <input name="area" maxLength={60} placeholder="Experience" />)}
        </div>
      ) : null}

      {destination === "budget" ? (
        <div className="ev-form-grid">
          {field("Category", (
            <select name="category" defaultValue="Experience">
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          ))}
          {field("Planned, dollars", <input name="planned" inputMode="decimal" required placeholder="450" />)}
        </div>
      ) : null}

      {destination === "resource" ? (
        <div className="ev-form-grid">
          {field("Kind", (
            <select name="kind" defaultValue="supply">
              <option value="supply">Supply</option>
              <option value="vendor">Vendor</option>
            </select>
          ))}
          {field("Quantity", <input name="quantity" maxLength={60} placeholder="60 units" />)}
        </div>
      ) : null}

      {destination === "decision" ? (
        <>
          {field("The question", (
            <input name="question" defaultValue={`${sparkTitle}?`} maxLength={300} required />
          ))}
          <div className="ev-form-grid">
            {field("Held by", <input name="owner" maxLength={80} />)}
            {field("Needed by", <input name="due" type="date" />)}
          </div>
        </>
      ) : null}

      {destination === "run-of-show" ? (
        <>
          {field("During which moment", (
            <select name="scheduleItemId" required>
              {scheduleMoments.map((moment) => (
                <option key={moment.id} value={moment.id}>{moment.label}</option>
              ))}
            </select>
          ))}
          <div className="ev-form-grid">
            {field("At", <input name="at" placeholder="8:45 pm" required />)}
            {field("Who", <input name="who" maxLength={80} />)}
          </div>
          {field("The cue", <input name="cue" defaultValue={sparkTitle} maxLength={300} />)}
        </>
      ) : null}

      <div className="ev-row-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Adding" : "Add it"}
        </button>
        <button type="button" className="ev-quiet" disabled={pending} onClick={() => setDestination(null)}>
          Somewhere else
        </button>
        <button type="button" className="ev-quiet" disabled={pending} onClick={close}>
          Cancel
        </button>
      </div>
      {message ? <p className="ev-row-detail" role="status">{message}</p> : null}
    </form>
  );
}
