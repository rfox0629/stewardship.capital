"use client";

import { useState, useTransition } from "react";

import { addToPlan, type PlanDestination } from "./actions";

/**
 * Where does this belong in the plan?
 *
 * Three homes: something happens (Schedule), someone does something (Task),
 * something is needed (Resource). None is required, any combination is fine,
 * and each form is prefilled from the spark so the idea is never typed twice.
 * A cost typed here rides the record itself; the budget adds it up.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

const DESTINATIONS: Array<{ key: PlanDestination; label: string; hint: string }> = [
  { key: "schedule", label: "Schedule", hint: "Something happens" },
  { key: "task", label: "Task", hint: "Someone does something" },
  { key: "resource", label: "Resource", hint: "Something is needed" },
];

const DAYS = [
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const TRACKS = ["Program", "Meals", "Experience", "Hospitality", "Logistics", "Worship"];

const KINDS = [
  { key: "person", label: "Person" },
  { key: "vendor", label: "Vendor" },
  { key: "equipment", label: "Equipment" },
  { key: "supply", label: "Supply" },
  { key: "deliverable", label: "Deliverable" },
];

const DAYPART_HINT: Record<string, string> = {
  morning: "9:00 am",
  afternoon: "2:00 pm",
  evening: "7:30 pm",
};

export function AddToPlan({
  route,
  sparkId,
  sparkTitle,
  tentativeDay,
  tentativeDaypart,
}: {
  route: Route;
  sparkId: string;
  sparkTitle: string;
  tentativeDay?: string | null;
  tentativeDaypart?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<PlanDestination | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
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
        <p className="ev-plan-q">Where does this belong?</p>
        <div className="ev-plan-dests">
          {DESTINATIONS.map((dest) => (
            <button key={dest.key} type="button" onClick={() => setDestination(dest.key)}>
              {dest.label}
              <span>{added.includes(dest.key) ? "Added ✓" : dest.hint}</span>
            </button>
          ))}
        </div>
        <div className="ev-row-actions">
          <button type="button" className="ev-quiet" onClick={close}>
            Done
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
          if (outcome.ok) {
            setAdded((prev) => [...prev, destination]);
            setDestination(null);
            setMessage(null);
          } else setMessage(outcome.message ?? "That did not save.");
        })
      }
    >
      <p className="ev-plan-q">
        {DESTINATIONS.find((d) => d.key === destination)?.label}, from this spark
      </p>

      {field("Title", <input name="title" defaultValue={sparkTitle} maxLength={160} />)}

      {destination === "schedule" ? (
        <>
          <div className="ev-form-grid">
            {field("Day", (
              <select name="day" defaultValue={tentativeDay ?? "sat"}>
                {DAYS.map((day) => (
                  <option key={day.key} value={day.key}>{day.label}</option>
                ))}
              </select>
            ))}
            {field("Starts", (
              <input
                name="starts"
                placeholder={DAYPART_HINT[tentativeDaypart ?? ""] ?? "8:45 pm"}
                required
              />
            ))}
            {field("Track", (
              <select name="track" defaultValue="Experience">
                {TRACKS.map((track) => <option key={track}>{track}</option>)}
              </select>
            ))}
          </div>
          {field("Where", <input name="location" maxLength={120} />)}
        </>
      ) : null}

      {destination === "task" ? (
        <div className="ev-form-grid">
          {field("Carried by", <input name="owner" maxLength={80} />)}
          {field("Due", <input name="due" type="date" />)}
          {field("Cost, if any", <input name="cost" inputMode="decimal" placeholder="0" />)}
        </div>
      ) : null}

      {destination === "resource" ? (
        <div className="ev-form-grid">
          {field("Kind", (
            <select name="kind" defaultValue="supply">
              {KINDS.map((kind) => (
                <option key={kind.key} value={kind.key}>{kind.label}</option>
              ))}
            </select>
          ))}
          {field("Contact", <input name="owner" maxLength={80} />)}
          {field("Estimated cost", <input name="cost" inputMode="decimal" placeholder="0" />)}
        </div>
      ) : null}

      <div className="ev-row-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Adding" : "Add it"}
        </button>
        <button type="button" className="ev-quiet" disabled={pending} onClick={() => setDestination(null)}>
          Back
        </button>
      </div>
      {message ? <p className="ev-row-detail" role="status">{message}</p> : null}
    </form>
  );
}
