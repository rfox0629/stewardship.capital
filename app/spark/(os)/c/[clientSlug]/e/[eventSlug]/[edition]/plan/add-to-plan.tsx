"use client";

import { useState, useTransition } from "react";

import { addToPlan, setIdeaCost, type PlanDestination } from "./actions";

/**
 * After yes, four optional questions.
 *
 * Nothing here is required and nothing is a form until it is asked for. Each
 * quick action opens one or two fields, never a page of them, because an idea
 * that only needs a time should cost one line of typing and an idea that
 * needs nothing should cost none.
 *
 * Money is asked once, on the idea, rather than on whichever record happened
 * to exist, so a number can never be counted twice.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };
type Quick = "time" | "action" | "cost" | "need";

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

const QUICKS: Array<{ key: Quick; label: string }> = [
  { key: "time", label: "Add time" },
  { key: "action", label: "Add action" },
  { key: "cost", label: "Add cost" },
  { key: "need", label: "Add requirement" },
];

export function AddToPlan({
  route,
  ideaId,
  ideaTitle,
  day,
  daypart,
  costDollars,
  done,
}: {
  route: Route;
  ideaId: string;
  ideaTitle: string;
  day: string | null;
  daypart: string | null;
  costDollars: number | null;
  done: Quick[];
}) {
  const [open, setOpen] = useState<Quick | null>(null);
  const [added, setAdded] = useState<Quick[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = new Set<Quick>([...done, ...added]);

  const send = (destination: PlanDestination, formData: FormData) =>
    startTransition(async () => {
      const outcome = await addToPlan(
        route.clientSlug, route.eventSlug, route.edition, ideaId, destination, formData,
      );
      if (outcome.ok) {
        setAdded((prev) => [...prev, open as Quick]);
        setOpen(null);
        setMessage(null);
      } else setMessage(outcome.message ?? "That did not save.");
    });

  return (
    <div className="ws-quick">
      <div className="ws-quick-row">
        {QUICKS.map((quick) => (
          <button
            key={quick.key}
            type="button"
            className={`ws-quick-btn ${complete.has(quick.key) ? "ws-quick-done" : ""} ${
              open === quick.key ? "ws-quick-on" : ""
            }`}
            onClick={() => { setOpen(open === quick.key ? null : quick.key); setMessage(null); }}
          >
            {complete.has(quick.key) ? "✓ " : "+ "}
            {quick.label.replace("Add ", "")}
          </button>
        ))}
      </div>

      {open === "time" ? (
        <form
          className="ws-quick-form"
          action={(formData) => {
            formData.set("title", ideaTitle);
            send("schedule", formData);
          }}
        >
          <select name="day" defaultValue={day ?? "sat"} aria-label="Day">
            {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <input name="starts" placeholder="2:00 pm" aria-label="Starts" autoFocus />
          <select name="daypart" defaultValue={daypart ?? "afternoon"} aria-label="Or part of day">
            {DAYPARTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <button type="submit" className="ws-btn" disabled={pending}>Add</button>
        </form>
      ) : null}

      {open === "action" ? (
        <form
          className="ws-quick-form"
          action={(formData) => {
            formData.set("title", ideaTitle);
            send("action", formData);
          }}
        >
          <input name="owner" placeholder="Who owns it" maxLength={80} autoFocus aria-label="Owner" />
          <input name="due" type="date" aria-label="Due" />
          <button type="submit" className="ws-btn" disabled={pending}>Add</button>
        </form>
      ) : null}

      {open === "cost" ? (
        <form
          className="ws-quick-form"
          action={(formData) =>
            startTransition(async () => {
              const outcome = await setIdeaCost(
                route.clientSlug, route.eventSlug, route.edition, ideaId,
                String(formData.get("amount") ?? ""),
              );
              if (outcome.ok) {
                setAdded((prev) => [...prev, "cost"]);
                setOpen(null);
                setMessage(null);
              } else setMessage(outcome.message ?? "That did not save.");
            })
          }
        >
          <span className="ws-quick-prefix">$</span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={costDollars ?? ""}
            placeholder="0"
            autoFocus
            aria-label="Amount"
          />
          <button type="submit" className="ws-btn" disabled={pending}>Save</button>
        </form>
      ) : null}

      {open === "need" ? (
        <form
          className="ws-quick-form"
          action={(formData) => {
            if (!String(formData.get("title") ?? "").trim()) formData.set("title", ideaTitle);
            send("need", formData);
          }}
        >
          <input name="title" placeholder="What is needed" maxLength={200} autoFocus aria-label="Requirement" />
          <select name="kind" defaultValue="supply" aria-label="Kind">
            <option value="person">Person</option>
            <option value="vendor">Vendor</option>
            <option value="equipment">Equipment</option>
            <option value="supply">Supply</option>
            <option value="deliverable">Deliverable</option>
          </select>
          <button type="submit" className="ws-btn" disabled={pending}>Add</button>
        </form>
      ) : null}

      {message ? <p className="ws-msg" role="status">{message}</p> : null}
    </div>
  );
}
