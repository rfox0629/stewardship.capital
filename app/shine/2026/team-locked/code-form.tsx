"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";

import { enterTeamCode, type CodeOutcome } from "./actions";

/**
 * The code, asked for once, plainly.
 *
 * The field is a password field so a shoulder or a screenshot does not carry
 * the code away, with a control to show it for anyone typing on a phone in
 * the dark. What is wrong is said next to the field rather than as a banner,
 * and the code is never suggested: no placeholder, no hint, no default.
 */

export function CodeForm({ next }: { next: string }) {
  const router = useRouter();
  const fieldId = useId();
  const [visible, setVisible] = useState(false);
  const [outcome, submit, pending] = useActionState<CodeOutcome | null, FormData>(
    enterTeamCode,
    null,
  );

  useEffect(() => {
    if (outcome?.ok) {
      router.replace(outcome.next);
      router.refresh();
    }
  }, [outcome, router]);

  const failed = outcome && !outcome.ok ? outcome.message : null;

  return (
    <form className="gd-code" action={submit} noValidate>
      <input type="hidden" name="next" value={next} />

      <label className="gd-code-label" htmlFor={fieldId}>Team code</label>
      <div className="gd-code-field">
        <input
          id={fieldId}
          name="code"
          type={visible ? "text" : "password"}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={failed ? true : undefined}
          aria-describedby={failed ? `${fieldId}-error` : undefined}
        />
        <button
          type="button"
          className="gd-code-peek"
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {failed ? (
        <p className="gd-code-error" id={`${fieldId}-error`} role="alert">{failed}</p>
      ) : null}

      <button type="submit" className="gd-code-go" disabled={pending}>
        {pending ? "Checking..." : "Open team guide"}
      </button>

      <Link className="gd-code-guest" href="/shine/2026">Open guest guide</Link>
    </form>
  );
}
