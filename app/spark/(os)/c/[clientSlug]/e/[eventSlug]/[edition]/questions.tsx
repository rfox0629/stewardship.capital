"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { setIdeaQuestion } from "./plan/actions";

/**
 * The questions hanging over the weekend.
 *
 * Not a stage and not a queue anyone has to clear: these are ideas like any
 * other that happen to be carrying something unresolved. Answering one is a
 * sentence and the flag comes off. Nothing about the idea moves.
 *
 * This used to be the largest thing on the event home: a white card with a
 * headline set at twenty one pixels and a green button, shouting one question
 * at a meeting that had come to look at the weekend. The number of open
 * questions is worth knowing at a glance; the questions themselves are worth
 * reading when somebody decides to read them. So it is a line, and the line
 * opens.
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
  const [showing, setShowing] = useState(false);
  const [, startTransition] = useTransition();

  const open = questions.filter((row) => !answered.has(row.id));
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

  /* Everything asked has been answered in this sitting. Say so once, quietly,
     and offer nothing to open. */
  if (open.length === 0) {
    return (
      <p className="wk-flagline wk-flagline-clear">
        <b>Answered</b>
        <span>
          {done === 1 ? "One question" : `${done} questions`}, nothing waiting on the room
        </span>
      </p>
    );
  }

  return (
    <div className="wk-flag-strip">
      <button
        type="button"
        className="wk-flagline"
        aria-expanded={showing}
        onClick={() => setShowing(!showing)}
      >
        <b>Needs an answer</b>
        <em>{open.length}</em>
        <span>waiting on the room</span>
        {done > 0 ? <span>{done} answered in this sitting</span> : null}
        <i aria-hidden="true">{showing ? "−" : "+"}</i>
      </button>

      {showing ? (
        <ol className="wk-flag-queue">
          {open.map((row) => (
            <li key={row.id}>
              <span className="wk-flag-q">
                <b>{row.title}</b>
                {row.question}
              </span>
              {planner ? (
                <span className="wk-flag-do">
                  <button type="button" onClick={() => clear(row)}>Answered</button>
                  <Link href={`${base}/plan?open=${row.id}`}>Open</Link>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}
    </div>
  );
}
