"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { addSparkNote, captureSpark, decideSpark } from "./actions";
import { AddToPlan } from "./add-to-plan";

/**
 * The pipeline as a board: three columns, compact cards, and a drawer for
 * everything deeper. A card at rest shows only what recognises it; the idea's
 * full story lives one click away.
 *
 * Dragging capture into discernment changes the real state. Dragging into
 * Move intentionally is more consequential, so the drop does not approve by
 * itself: it opens the decision, asks for the sentence, and only then moves
 * the card. Every drag has a button twin in the drawer, and on a phone the
 * buttons are the way.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type BoardSpark = {
  id: string;
  title: string;
  detail: string | null;
  category: string;
  status: string;
  raisedBy: string | null;
  decision: string | null;
  links: Array<{ kind: string; label: string; href: string }>;
  notes: Array<{ author: string | null; body: string; at: string }>;
};

const CATEGORIES = [
  "Experience", "Hospitality", "Program", "Generosity", "Logistics", "Communications",
];

const KIND_SHORT: Record<string, string> = {
  Schedule: "SCHED",
  Task: "TASK",
  Budget: "BUDGET",
  Resource: "RES",
  Decision: "DECIDE",
  "Run of show": "ROS",
};

const noopSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(noopSubscribe, () => true, () => false);

type Modal =
  | { kind: "approve"; spark: BoardSpark; via: "drag" | "drawer" }
  | { kind: "settle"; spark: BoardSpark; to: "parked" | "declined" }
  | null;

export function SparkBoard({
  sparks,
  route,
  planner,
  scheduleMoments,
}: {
  sparks: BoardSpark[];
  route: Route;
  planner: boolean;
  scheduleMoments: Array<{ id: string; label: string }>;
}) {
  const hydrated = useHydrated();
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("open")
      : null,
  );
  const [capturing, setCapturing] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [statusOverride, setStatusOverride] = useState<Map<string, string>>(new Map());
  const [failure, setFailure] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const merged = useMemo(
    () =>
      sparks.map((spark) => ({
        ...spark,
        status: statusOverride.get(spark.id) ?? spark.status,
      })),
    [sparks, statusOverride],
  );

  const move = (spark: BoardSpark, to: string, rationale?: string) => {
    setStatusOverride((prev) => new Map(prev).set(spark.id, to));
    setFailure(null);
    startTransition(async () => {
      const outcome = await decideSpark(
        route.clientSlug, route.eventSlug, route.edition, spark.id, to, rationale,
      );
      if (!outcome.ok) {
        setStatusOverride((prev) => {
          const next = new Map(prev);
          next.delete(spark.id);
          return next;
        });
        setFailure("That move did not save, so the card was put back.");
      }
    });
  };

  const onDropTo = (target: "discussing" | "approved") => (event: React.DragEvent) => {
    event.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const spark = merged.find((candidate) => candidate.id === id);
    if (!spark) return;

    if (target === "discussing" && spark.status === "captured") {
      move(spark, "discussing");
    } else if (target === "discussing" && spark.status === "parked") {
      move(spark, "discussing");
    } else if (target === "approved" && spark.status === "discussing") {
      /* Crossing this line is a decision, not a gesture. */
      setModal({ kind: "approve", spark, via: "drag" });
    }
  };

  const columns: Array<{
    key: "captured" | "discussing" | "approved";
    title: string;
    drop?: "discussing" | "approved";
  }> = [
    { key: "captured", title: "Capture freely" },
    { key: "discussing", title: "Discern carefully", drop: "discussing" },
    { key: "approved", title: "Move intentionally", drop: "approved" },
  ];

  const rested = merged.filter((spark) => spark.status === "parked" || spark.status === "declined");
  const open = hydrated ? (merged.find((spark) => spark.id === openId) ?? null) : null;

  const card = (spark: BoardSpark) => (
    <button
      key={spark.id}
      type="button"
      className="ev-k-card"
      draggable={planner && (spark.status === "captured" || spark.status === "discussing")}
      onDragStart={() => {
        dragId.current = spark.id;
      }}
      onClick={() => setOpenId(spark.id)}
    >
      <span className="ev-k-title">{spark.title}</span>
      <span className="ev-k-kicker">
        {spark.category}
        {spark.raisedBy ? ` · ${spark.raisedBy}` : ""}
      </span>
      {(spark.links.length > 0 || spark.notes.length > 0) && (
        <span className="ev-k-chips">
          {[...new Set(spark.links.map((link) => link.kind))].map((kind) => (
            <em key={kind}>{KIND_SHORT[kind] ?? kind}</em>
          ))}
          {spark.notes.length > 0 ? <i>{spark.notes.length} ✎</i> : null}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div className="ev-schedule-bar">
        <p className="ev-flowline">Capture freely → Discern carefully → Move intentionally</p>
        <div className="ev-bar-right">
          {failure ? <span className="ev-bar-failure" role="status">{failure}</span> : null}
          {rested.length > 0 ? (
            <button type="button" className="ev-bar-quiet" onClick={() => setRestOpen(true)}>
              At rest · {rested.length}
            </button>
          ) : null}
          <button type="button" className="ev-bar-add" onClick={() => setCapturing(true)}>
            Capture
          </button>
        </div>
      </div>

      <div className="ev-kboard">
        {columns.map((column) => (
          <section
            key={column.key}
            className="ev-kcol"
            aria-label={column.title}
            onDragOver={
              planner && column.drop ? (event) => event.preventDefault() : undefined
            }
            onDrop={planner && column.drop ? onDropTo(column.drop) : undefined}
          >
            <div className="ev-kcol-head">
              <h3>{column.title}</h3>
              <span>{merged.filter((spark) => spark.status === column.key).length}</span>
            </div>
            <div className="ev-kcol-cards">
              {merged.filter((spark) => spark.status === column.key).map(card)}
            </div>
          </section>
        ))}
      </div>

      {capturing ? (
        <CaptureDrawer route={route} onClose={() => setCapturing(false)} />
      ) : null}

      {restOpen ? (
        <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label="At rest">
          <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={() => setRestOpen(false)} />
          <div className="ev-drawer">
            <div className="ev-drawer-head">
              <p className="ev-drawer-kicker">At rest</p>
              <button type="button" className="ev-drawer-x" onClick={() => setRestOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="ev-drawer-body">
              {rested.map((spark) => (
                <div key={spark.id} className="ev-rest-row">
                  <p className="ev-k-title">{spark.title}</p>
                  <p className="ev-k-kicker">
                    {spark.status === "parked" ? "Parked" : "Declined"} · {spark.category}
                  </p>
                  {spark.decision ? <p className="ev-drawer-note">{spark.decision}</p> : null}
                  {planner ? (
                    <div className="ev-row-actions">
                      <button type="button" onClick={() => { move(spark, "discussing"); setRestOpen(false); }}>
                        Reopen
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <SparkDrawer
          spark={open}
          route={route}
          planner={planner}
          scheduleMoments={scheduleMoments}
          onClose={() => setOpenId(null)}
          onMove={move}
          onAskApprove={() => setModal({ kind: "approve", spark: open, via: "drawer" })}
          onAskSettle={(to) => setModal({ kind: "settle", spark: open, to })}
        />
      ) : null}

      {modal ? (
        <DecisionModal
          modal={modal}
          onClose={() => setModal(null)}
          onCommit={(rationale) => {
            if (modal.kind === "approve") move(modal.spark, "approved", rationale);
            else move(modal.spark, modal.to, rationale);
            setModal(null);
            setOpenId(null);
          }}
        />
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------- capture */

function CaptureDrawer({ route, onClose }: { route: Route; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label="Capture an idea">
      <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={onClose} />
      <div className="ev-drawer">
        <div className="ev-drawer-head">
          <p className="ev-drawer-kicker">Capture freely</p>
          <button type="button" className="ev-drawer-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form
          className="ev-drawer-body"
          action={(formData) =>
            startTransition(async () => {
              const outcome = await captureSpark(
                route.clientSlug, route.eventSlug, route.edition, formData,
              );
              if (outcome.ok) onClose();
              else setMessage("That did not save.");
            })
          }
        >
          <div className="ev-field">
            <label>The idea</label>
            <input name="title" required maxLength={160} autoFocus />
          </div>
          <div className="ev-field">
            <label>A little more, if it helps</label>
            <textarea name="detail" rows={2} maxLength={600} />
          </div>
          <div className="ev-field">
            <label>Feels like</label>
            <select name="category" defaultValue="Experience">
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="ev-row-actions">
            <button type="submit" disabled={pending}>{pending ? "Capturing" : "Capture"}</button>
            <button type="button" className="ev-quiet" onClick={onClose}>Cancel</button>
          </div>
          {message ? <p className="ev-drawer-msg" role="status">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}

/* --------------------------------------------------- the spark drawer */

function SparkDrawer({
  spark,
  route,
  planner,
  scheduleMoments,
  onClose,
  onMove,
  onAskApprove,
  onAskSettle,
}: {
  spark: BoardSpark;
  route: Route;
  planner: boolean;
  scheduleMoments: Array<{ id: string; label: string }>;
  onClose: () => void;
  onMove: (spark: BoardSpark, to: string) => void;
  onAskApprove: () => void;
  onAskSettle: (to: "parked" | "declined") => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  return (
    <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label={spark.title}>
      <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={onClose} />
      <div className="ev-drawer">
        <div className="ev-drawer-head">
          <p className="ev-drawer-kicker">
            {spark.category}
            {spark.raisedBy ? ` · ${spark.raisedBy}` : ""}
          </p>
          <button type="button" className="ev-drawer-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ev-drawer-body">
          <h3 className="ev-drawer-title">{spark.title}</h3>
          {spark.detail ? <p className="ev-drawer-note">{spark.detail}</p> : null}
          {spark.decision ? <p className="ev-row-decision">{spark.decision}</p> : null}

          {planner ? (
            <div className="ev-row-actions">
              {spark.status === "captured" ? (
                <button type="button" disabled={pending} onClick={() => { onMove(spark, "discussing"); onClose(); }}>
                  Bring into discernment
                </button>
              ) : null}
              {spark.status === "discussing" ? (
                <>
                  <button type="button" disabled={pending} onClick={onAskApprove}>Approve</button>
                  <button type="button" className="ev-quiet" disabled={pending} onClick={() => onAskSettle("parked")}>
                    Park
                  </button>
                  <button type="button" className="ev-quiet" disabled={pending} onClick={() => onAskSettle("declined")}>
                    Decline
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {planner && spark.status === "approved" ? (
            <AddToPlan
              route={route}
              sparkId={spark.id}
              sparkTitle={spark.title}
              scheduleMoments={scheduleMoments}
            />
          ) : null}

          {spark.links.length > 0 ? (
            <div className="ev-drawer-section">
              <p className="ev-drawer-sub">In the plan</p>
              {spark.links.map((link, index) => (
                <Link key={index} className="ev-drawer-link" href={link.href}>
                  <b>{link.kind}</b> {link.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="ev-drawer-section">
            <p className="ev-drawer-sub">Notes</p>
            {spark.notes.map((entry, index) => (
              <p key={index} className="ev-drawer-noteline">
                {entry.body}
                <span>{entry.author ?? ""} · {entry.at}</span>
              </p>
            ))}
            <form
              className="ev-drawer-noteform"
              action={() =>
                startTransition(async () => {
                  if (!note.trim()) return;
                  await addSparkNote(
                    route.clientSlug, route.eventSlug, route.edition, spark.id, note,
                  );
                  setNote("");
                })
              }
            >
              <input
                value={note}
                maxLength={1000}
                placeholder="Add a note"
                onChange={(event) => setNote(event.target.value)}
              />
              <button type="submit" disabled={pending || !note.trim()}>Add</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------- the decision, in words */

function DecisionModal({
  modal,
  onClose,
  onCommit,
}: {
  modal: NonNullable<Modal>;
  onClose: () => void;
  onCommit: (rationale: string) => void;
}) {
  const [rationale, setRationale] = useState("");
  const label =
    modal.kind === "approve"
      ? "What was decided, in a sentence"
      : modal.to === "parked"
        ? "Why it waits"
        : "Why not";

  return (
    <div className="ev-drawer-wrap" role="dialog" aria-modal="true" aria-label="The decision">
      <button type="button" className="ev-drawer-scrim" aria-label="Close" onClick={onClose} />
      <div className="ev-modal">
        <p className="ev-drawer-kicker">
          {modal.kind === "approve" ? "Move intentionally" : modal.to === "parked" ? "Park" : "Decline"}
        </p>
        <h3 className="ev-drawer-title">{modal.spark.title}</h3>
        <div className="ev-field">
          <label>{label}</label>
          <input
            value={rationale}
            maxLength={400}
            autoFocus
            onChange={(event) => setRationale(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && rationale.trim()) onCommit(rationale.trim());
            }}
          />
        </div>
        <div className="ev-row-actions">
          <button type="button" disabled={!rationale.trim()} onClick={() => onCommit(rationale.trim())}>
            {modal.kind === "approve" ? "Approve" : modal.to === "parked" ? "Park it" : "Decline"}
          </button>
          <button type="button" className="ev-quiet" onClick={onClose}>Not yet</button>
        </div>
      </div>
    </div>
  );
}
