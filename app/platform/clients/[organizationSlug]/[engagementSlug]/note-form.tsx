"use client";

import { useRef, useState, useTransition } from "react";

import { createEngagementNote } from "../../../actions";

/**
 * A title, a body, a button. The server action re-checks the staff grant on
 * its own request; this only carries what was typed and shows what came back.
 */
export function NoteForm({
  engagementId,
  organizationSlug,
  engagementSlug,
}: {
  engagementId: string;
  organizationSlug: string;
  engagementSlug: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className="pf-form"
      action={(formData) =>
        startTransition(async () => {
          const outcome = await createEngagementNote(formData);
          setMessage(outcome.ok ? "Saved." : (outcome.message ?? "Refused."));
          if (outcome.ok) ref.current?.reset();
        })
      }
    >
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="engagementSlug" value={engagementSlug} />
      <div className="pf-field">
        <label htmlFor="note-title">Title</label>
        <input id="note-title" name="title" required maxLength={200} placeholder="Meeting with Danny" />
      </div>
      <div className="pf-field">
        <label htmlFor="note-body">Notes</label>
        <textarea id="note-body" name="body" required maxLength={20000} rows={8} />
      </div>
      <button className="pf-submit" type="submit" disabled={pending}>
        {pending ? "Saving" : "Add note"}
      </button>
      {message ? <p className="pf-message" role="status">{message}</p> : null}
    </form>
  );
}
