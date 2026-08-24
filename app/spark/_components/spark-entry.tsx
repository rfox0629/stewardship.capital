"use client";

import { useState, useTransition } from "react";

import type { Choice } from "../../../lib/spark/access";
import {
  chooseWorkspace,
  requestAccess,
  signOutOfSpark,
  verifyAccess,
} from "../actions";

type Stage =
  | { name: "email" }
  | { name: "code"; hint: string; wrong?: boolean }
  | { name: "refused" }
  | { name: "choose"; workspaces: Choice[] };

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4 12h15M13 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Two steps and nothing else.
 *
 * Everything that decides identity happens on the server. Typing an address
 * gets a code posted to it and no further, and the only thing this component
 * ever learns afterwards is which of that person's own workspaces to offer.
 * It is never told what it asked about was a real address, so there is nothing
 * here to read for who has access.
 */
export function SparkEntry({
  initialStage,
}: {
  initialStage: Stage;
}) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  if (stage.name === "refused") {
    return (
      <>
        <p className="entry-refused" role="status">
          Spark is invitation only. Ask your Stewardship.Capital contact for
          access.
        </p>
        <p className="entry-note">
          <button
            type="button"
            className="entry-plain"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void signOutOfSpark();
              })
            }
          >
            Sign out
          </button>
        </p>
      </>
    );
  }

  if (stage.name === "choose") {
    return (
      <div className="entry-choose">
        <p className="entry-label">Continue to</p>
        <ul>
          {stage.workspaces.map((workspace) => (
            <li key={workspace.engagementId}>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void chooseWorkspace(workspace.engagementId);
                  })
                }
              >
                <span className="entry-choose-client">{workspace.clientName}</span>
                <span className="entry-choose-label">
                  {workspace.engagementName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (stage.name === "code") {
    return (
      <form
        className="entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const outcome = await verifyAccess(code);
            if (outcome.status === "choose") {
              setStage({ name: "choose", workspaces: outcome.workspaces });
            } else if (outcome.status === "refused") {
              setStage({ name: "refused" });
            } else if (outcome.status === "restart") {
              setCode("");
              setStage({ name: "email" });
            } else {
              setStage({ ...stage, wrong: true });
            }
          });
        }}
      >
        <label className="entry-label" htmlFor="entry-code">
          Code sent to {stage.hint}
        </label>
        <div className="entry-row">
          <input
            id="entry-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            spellCheck={false}
            placeholder="Your code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button className="entry-button" type="submit" disabled={pending}>
            {pending ? "Checking" : "Continue"}
            <Arrow />
          </button>
        </div>
        {stage.wrong ? (
          <p className="entry-hint" role="status">
            That code did not match. Check the most recent email.
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const outcome = await requestAccess(email);
          if (outcome.status === "sent") {
            setStage({ name: "code", hint: outcome.hint });
          }
        });
      }}
    >
      <label className="entry-label" htmlFor="entry-email">
        Email
      </label>
      <div className="entry-row">
        <input
          id="entry-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="entry-button" type="submit" disabled={pending}>
          {pending ? "Sending" : "Continue"}
          <Arrow />
        </button>
      </div>
    </form>
  );
}
