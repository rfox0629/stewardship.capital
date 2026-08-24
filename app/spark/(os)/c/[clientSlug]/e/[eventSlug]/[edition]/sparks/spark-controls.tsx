"use client";

import { useRef, useState, useTransition } from "react";

import { captureSpark, decideSpark } from "./actions";

type RouteProps = {
  clientSlug: string;
  eventSlug: string;
  edition: string;
};

const CATEGORIES = [
  "Experience",
  "Hospitality",
  "Program",
  "Generosity",
  "Logistics",
  "Communications",
];

/**
 * Capturing is deliberately the easiest thing on the page: a title is enough.
 * Nothing here assigns, schedules, or costs anything, because a spark is an
 * idea and ideas need room to exist before anyone decides what they are.
 */
export function CaptureForm(route: RouteProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <form
      ref={formRef}
      className="ev-capture"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await captureSpark(
            route.clientSlug,
            route.eventSlug,
            route.edition,
            formData,
          );
          if (outcome.ok) {
            formRef.current?.reset();
            setFailed(false);
          } else {
            setFailed(true);
          }
        })
      }
    >
      <p className="ev-capture-title">Have an idea?</p>
      <p className="ev-capture-sub">
        Put it down while it is fresh. It costs nothing to capture, and the
        team will sit with it before anything is decided.
      </p>

      <div className="ev-field">
        <label htmlFor="spark-title">The idea</label>
        <input
          id="spark-title"
          name="title"
          required
          maxLength={160}
          placeholder="Sunrise pontoon prayer on Saturday"
        />
      </div>

      <div className="ev-field">
        <label htmlFor="spark-detail">A little more, if it helps</label>
        <textarea id="spark-detail" name="detail" rows={2} maxLength={600} />
      </div>

      <div className="ev-field">
        <label htmlFor="spark-category">Feels like</label>
        <select id="spark-category" name="category" defaultValue="Experience">
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <button className="ev-submit" type="submit" disabled={pending}>
        {pending ? "Capturing" : "Capture it"}
      </button>
      {failed ? (
        <p className="ev-capture-sub" role="status" style={{ marginTop: 10 }}>
          That did not save. Try once more.
        </p>
      ) : null}
    </form>
  );
}

/**
 * The planner's discernment controls, as quiet text actions on the row.
 * Approving asks for the decision in words, because a decision without a
 * sentence behind it reads as a click rather than a judgment.
 */
export function DecideControls({
  route,
  sparkId,
  status,
}: {
  route: RouteProps;
  sparkId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [deciding, setDeciding] = useState<"approved" | "parked" | "declined" | null>(
    null,
  );
  const [decision, setDecision] = useState("");

  const move = (next: string, note?: string) =>
    startTransition(async () => {
      await decideSpark(
        route.clientSlug,
        route.eventSlug,
        route.edition,
        sparkId,
        next,
        note,
      );
      setDeciding(null);
      setDecision("");
    });

  if (status === "captured") {
    return (
      <div className="ev-row-actions">
        <button type="button" disabled={pending} onClick={() => move("discussing")}>
          Bring into discernment
        </button>
      </div>
    );
  }

  if (status === "parked") {
    return (
      <div className="ev-row-actions">
        <button
          type="button"
          className="ev-quiet"
          disabled={pending}
          onClick={() => move("discussing")}
        >
          Reopen
        </button>
      </div>
    );
  }

  if (status !== "discussing") return null;

  if (deciding) {
    return (
      <div className="ev-capture" style={{ marginTop: 10 }}>
        <div className="ev-field">
          <label htmlFor={`decision-${sparkId}`}>
            {deciding === "approved"
              ? "What was decided, in a sentence"
              : deciding === "parked"
                ? "Why it waits"
                : "Why not"}
          </label>
          <input
            id={`decision-${sparkId}`}
            value={decision}
            maxLength={400}
            autoFocus
            onChange={(event) => setDecision(event.target.value)}
          />
        </div>
        <div className="ev-row-actions">
          <button
            type="button"
            disabled={pending || !decision.trim()}
            onClick={() => move(deciding, decision)}
          >
            {deciding === "approved"
              ? "Approve"
              : deciding === "parked"
                ? "Park it"
                : "Decline"}
          </button>
          <button
            type="button"
            className="ev-quiet"
            disabled={pending}
            onClick={() => setDeciding(null)}
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-row-actions">
      <button type="button" disabled={pending} onClick={() => setDeciding("approved")}>
        Approve
      </button>
      <button
        type="button"
        className="ev-quiet"
        disabled={pending}
        onClick={() => setDeciding("parked")}
      >
        Park
      </button>
      <button
        type="button"
        className="ev-quiet"
        disabled={pending}
        onClick={() => setDeciding("declined")}
      >
        Decline
      </button>
    </div>
  );
}
