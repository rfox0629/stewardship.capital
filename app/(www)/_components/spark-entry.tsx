"use client";

import { useState, useTransition } from "react";

import { checkAccess, chooseWorkspace } from "../more/actions";
import type { AccessResult } from "../../../lib/spark/types";

/**
 * The way in.
 *
 * Email first. Everything that decides access happens on the server; the only
 * thing this component ever learns is whether the address that was typed has a
 * way in, and if so, which of that person's own workspaces to offer. There is
 * no call here that can return a list of clients.
 */
export function SparkEntry() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.status === "unauthorized") {
    return (
      <p className="entry-refused" role="status">
        Spark is invitation only. Ask your Stewardship.Capital contact for
        access.
      </p>
    );
  }

  if (result?.status === "choose") {
    return (
      <div className="entry-choose">
        <p className="entry-label">Continue to</p>
        <ul>
          {result.workspaces.map((workspace) => (
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

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setResult(await checkAccess(email));
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
    </form>
  );
}
