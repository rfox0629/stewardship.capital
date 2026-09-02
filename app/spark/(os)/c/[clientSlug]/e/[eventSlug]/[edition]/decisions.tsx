"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { setIdeaState } from "./plan/actions";
import { AddToPlan } from "./plan/add-to-plan";

/**
 * The decisions waiting on the room.
 *
 * One at a time, deliberately. A meeting that can see twelve open questions
 * at once answers none of them, so the queue puts a single question in front
 * of the room with its three answers under it, and the moment one is settled
 * the next takes its place. The rest stay visible as a short line of what is
 * coming, which is what a room needs to know: how much further.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Decision = {
  id: string;
  title: string;
  detail: string | null;
  day: string | null;
};

const DAY_LABEL: Record<string, string> = {
  wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export function DecisionQueue({
  decisions,
  route,
  base,
  planner,
}: {
  decisions: Decision[];
  route: Route;
  base: string;
  planner: boolean;
}) {
  const [settled, setSettled] = useState<Set<string>>(new Set());
  /* What the room just said yes to. It stays in reach for a moment so the
     sentence that always follows the decision, "and that is Friday at two",
     has somewhere to go without anyone leaving the queue. */
  const [justYes, setJustYes] = useState<Decision | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const queue = decisions.filter((decision) => !settled.has(decision.id));
  const current = queue[0] ?? null;
  const rest = queue.slice(1);
  const answered = decisions.length - queue.length;

  const decide = (decision: Decision, state: "planned" | "aside") => {
    setSettled((prev) => new Set(prev).add(decision.id));
    setJustYes(state === "planned" ? decision : null);
    setFailure(null);
    startTransition(async () => {
      const outcome = await setIdeaState(
        route.clientSlug, route.eventSlug, route.edition, decision.id, state,
      );
      if (!outcome.ok) {
        setSettled((prev) => {
          const next = new Set(prev);
          next.delete(decision.id);
          return next;
        });
        setFailure("That did not save, so the question came back.");
      }
    });
  };

  if (decisions.length === 0) return null;

  if (!current) {
    return (
      <section className="wk-queue wk-queue-clear" aria-label="Decisions">
        <p className="wk-queue-clear-line">
          {answered === 1 ? "One decision made." : `${answered} decisions made.`} Nothing else is
          waiting on the room.
        </p>
        <Link href={`${base}/schedule`} className="ws-btn">See the weekend</Link>
      </section>
    );
  }

  return (
    <section className="wk-queue" aria-label="Needs a decision">
      <header className="wk-queue-head">
        <h3>Needs a decision</h3>
        <span>
          {answered > 0 ? `${answered} done · ` : ""}
          {queue.length} left
        </span>
      </header>

      <div className="wk-now">
        <div className="wk-now-body">
          {current.day ? <em className="wk-now-day">{DAY_LABEL[current.day] ?? current.day}</em> : null}
          <h4>{current.title}</h4>
          {current.detail ? <p>{current.detail}</p> : null}
        </div>
        {planner ? (
          <div className="wk-now-answers">
            <button type="button" className="wk-yes" onClick={() => decide(current, "planned")}>
              Yes, use it
            </button>
            <Link className="wk-open" href={`${base}/plan?open=${current.id}`}>
              Open
            </Link>
            <button type="button" className="wk-no" onClick={() => decide(current, "aside")}>
              Not now
            </button>
          </div>
        ) : null}
      </div>

      {justYes ? (
        <div className="wk-justdid">
          <p>
            <b>{justYes.title}</b> is in the plan. Anything it needs?
          </p>
          <AddToPlan
            route={route}
            ideaId={justYes.id}
            ideaTitle={justYes.title}
            day={justYes.day}
            daypart={null}
            costDollars={null}
            done={[]}
          />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ol className="wk-upnext">
          {rest.map((decision) => (
            <li key={decision.id}>
              <span>{decision.title}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}
    </section>
  );
}
