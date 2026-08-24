"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The way in.
 *
 * Deliberately two controls. There is no Spark account system yet, so this
 * does not authenticate anything and says so rather than pretending. No
 * password field: never ask for a credential a form cannot honour.
 */
export function SparkEntry() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/events-os");
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="entry-button" type="submit">
          Continue
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
