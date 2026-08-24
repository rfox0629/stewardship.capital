"use client";

import { useState, useTransition } from "react";

import { chooseWorkspace, requestCode, verifyCode } from "../more/actions";

type Choice = { id: string; client: string; label: string };

type Stage =
  | { name: "email" }
  | { name: "code"; hint: string; wrong?: boolean }
  | { name: "refused" }
  | { name: "undeliverable" }
  | { name: "choose"; workspaces: Choice[] };

/**
 * Two steps and nothing else.
 *
 * Knowing an address gets a code posted to it and no further. Everything that
 * decides identity happens on the server, and the only thing this component
 * ever learns is whether to ask for a code, and afterwards which of that
 * person's own workspaces to offer.
 */
export function SparkEntry({
  initialStage,
}: {
  initialStage: { name: "email" } | { name: "code"; hint: string };
}) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  if (stage.name === "refused") {
    return (
      <p className="entry-refused" role="status">
        Spark is invitation only. Ask your Stewardship.Capital contact for
        access.
      </p>
    );
  }

  if (stage.name === "undeliverable") {
    return (
      <p className="entry-refused" role="status">
        Spark could not send a code right now. Ask your Stewardship.Capital
        contact for access.
      </p>
    );
  }

  if (stage.name === "choose") {
    return (
      <div className="entry-choose">
        <p className="entry-label">Continue to</p>
        <ul>
          {stage.workspaces.map((workspace) => (
            <li key={workspace.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void chooseWorkspace(workspace.id);
                  })
                }
              >
                <span className="entry-choose-client">{workspace.client}</span>
                <span className="entry-choose-label">{workspace.label}</span>
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
            const outcome = await verifyCode(code);
            if (outcome.status === "choose") {
              setStage({ name: "choose", workspaces: outcome.workspaces });
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
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            spellCheck={false}
            placeholder="8 characters"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button className="entry-button" type="submit" disabled={pending}>
            {pending ? "Checking" : "Continue"}
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
          const outcome = await requestCode(email);
          if (outcome.status === "sent") {
            setStage({ name: "code", hint: outcome.hint });
          } else if (outcome.status === "undeliverable") {
            setStage({ name: "undeliverable" });
          } else {
            setStage({ name: "refused" });
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
        </button>
      </div>
    </form>
  );
}
