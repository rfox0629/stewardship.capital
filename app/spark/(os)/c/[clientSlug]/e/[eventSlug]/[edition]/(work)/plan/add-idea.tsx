"use client";

import { useState, useTransition } from "react";

import { addIdea } from "./actions";

/**
 * Capture first, plan later: a name, and roughly where it belongs.
 *
 * The one way an idea is created, wherever a person happens to be standing.
 * It asks for a title and nothing else; placement is optional and the default
 * is honestly not knowing, because in a meeting the thought arrives before
 * the day does.
 */

const DAYS = [
  { key: "wed", label: "Wed" }, { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const ADD_PLACEMENTS = [
  { key: "", label: "Not sure yet" },
  { key: "all", label: "Event-wide" },
  ...DAYS,
];

export function AddIdea({
  onAdd, onClose,
}: {
  onAdd: (title: string, day: string | null) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [placing, setPlacing] = useState(false);

  return (
    <div className="ws-panel-wrap ws-modal-wrap" role="dialog" aria-modal="true" aria-label="Add an idea">
      <button type="button" className="ws-scrim" aria-label="Close" onClick={onClose} />
      <div className="ws-modal-card">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onAdd(title.trim(), day || null);
        }}>
          <label className="ws-modal-label" htmlFor="new-idea">What is the idea?</label>
          <input id="new-idea" className="ws-modal-input" value={title} maxLength={200} autoFocus
            placeholder="Glow run" onChange={(event) => setTitle(event.target.value)} />

          {placing ? (
            <>
              <p className="ws-modal-label">Where might it fit? <em>Optional</em></p>
              <div className="ws-modal-days">
                {ADD_PLACEMENTS.map((d) => (
                  <button key={d.key || "unplaced"} type="button" aria-pressed={day === d.key}
                    onClick={() => setDay(d.key)}>{d.label}</button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="ws-flag ws-place-toggle" onClick={() => setPlacing(true)}>
              + Add placement
            </button>
          )}

          <div className="ws-modal-actions">
            <button type="submit" className="ws-btn" disabled={!title.trim()}>Add idea</button>
            <button type="button" className="ws-btn-quiet" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * The same capture, for callers that only want it to happen and do not draw
 * an optimistic card of their own. The Weekend uses this: the idea it makes
 * belongs to the Plan, and arrives here on the next read.
 */
export function CaptureIdea({
  route, onClose, onFailed,
}: {
  route: { clientSlug: string; eventSlug: string; edition: string };
  onClose: () => void;
  onFailed: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  return (
    <AddIdea
      onClose={onClose}
      onAdd={(title, day) => {
        onClose();
        startTransition(async () => {
          const outcome = await addIdea(route.clientSlug, route.eventSlug, route.edition, title, day);
          if (!outcome.ok) onFailed(outcome.message ?? "That idea did not save.");
        });
      }}
    />
  );
}
