"use client";

import { useTransition } from "react";

import { setTaskDone } from "./actions";

/**
 * The planner's one control on a task row, as quiet text.
 */
export function TaskControl({
  clientSlug,
  eventSlug,
  edition,
  taskId,
  done,
}: {
  clientSlug: string;
  eventSlug: string;
  edition: string;
  taskId: string;
  done: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="ev-row-actions">
      <button
        type="button"
        className={done ? "ev-quiet" : undefined}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setTaskDone(clientSlug, eventSlug, edition, taskId, !done);
          })
        }
      >
        {done ? "Reopen" : "Mark done"}
      </button>
    </div>
  );
}
