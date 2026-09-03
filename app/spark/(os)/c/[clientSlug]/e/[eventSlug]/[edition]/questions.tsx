"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { setIdeaQuestion } from "./plan/actions";

/**
 * The questions hanging over the weekend.
 *
 * Not a stage and not a queue anyone has to clear: these are ideas like any
 * other that happen to be carrying something unresolved. The room sees them
 * one at a time, answers in a sentence, and the flag comes off. Nothing about
 * the idea moves.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Question = { id: string; title: string; question: string };

export function QuestionQueue({
  questions,
  route,
  base,
  planner,
}: {
  questions: Question[];
  route: Route;
  base: string;
  planner: boolean;
}) {
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const open = questions.filter((row) => !answered.has(row.id));
  const current = open[0] ?? null;
  const rest = open.slice(1);
  const done = questions.length - open.length;

  const clear = (row: Question) => {
    setAnswered((prev) => new Set(prev).add(row.id));
    setFailure(null);
    startTransition(async () => {
      const outcome = await setIdeaQuestion(route.clientSlug, route.eventSlug, route.edition, row.id, "");
      if (!outcome.ok) {
        setAnswered((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
        setFailure("That did not save, so the question came back.");
      }
    });
  };

  if (questions.length === 0) return null;

  if (!current) {
    return (
      <section className="wk-queue wk-queue-clear" aria-label="Questions">
        <p className="wk-queue-clear-line">
          {done === 1 ? "One question answered." : `${done} questions answered.`} Nothing else is
          waiting on the room.
        </p>
        <Link href={`${base}/schedule`} className="ws-btn">See the weekend</Link>
      </section>
    );
  }

  return (
    <section className="wk-queue" aria-label="Needs an answer">
      <header className="wk-queue-head">
        <h3>Needs an answer</h3>
        <span>{done > 0 ? `${done} answered · ` : ""}{open.length} left</span>
      </header>

      <div className="wk-now">
        <div className="wk-now-body">
          <em className="wk-now-day">{current.title}</em>
          <h4>{current.question}</h4>
        </div>
        {planner ? (
          <div className="wk-now-answers">
            <button type="button" className="wk-yes" onClick={() => clear(current)}>
              Answered
            </button>
            <Link className="wk-open" href={`${base}/plan?open=${current.id}`}>Open</Link>
          </div>
        ) : null}
      </div>

      {rest.length > 0 ? (
        <ol className="wk-upnext">
          {rest.map((row) => <li key={row.id}><span>{row.title}</span></li>)}
        </ol>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}
    </section>
  );
}
