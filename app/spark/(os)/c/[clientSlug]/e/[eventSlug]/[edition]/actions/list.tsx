"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { addAction, addNeed, setNeedStatus, updateAction } from "./actions";

/**
 * What needs to happen.
 *
 * A row is the whole interaction: tick it done, retitle it, hand it to
 * someone, give it a date. Adding one is a line of typing at the top, so a
 * thought voiced in a meeting is recorded before the sentence has finished.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

export type Action = {
  id: string;
  title: string;
  owner: string | null;
  due: string | null;
  status: string;
  from: { label: string; href: string } | null;
};

export type Need = {
  id: string;
  name: string;
  kind: string;
  status: string;
  costCents: number;
  from: { label: string; href: string } | null;
};

const dueLabel = (value: string | null) =>
  value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", timeZone: "UTC",
      })
    : null;

const overdue = (value: string | null) =>
  value ? new Date(`${value}T12:00:00Z`) < new Date() : false;

export function ActionList({
  actions,
  needs,
  route,
  planner,
}: {
  actions: Action[];
  needs: Need[];
  route: Route;
  planner: boolean;
}) {
  const [lens, setLens] = useState<"actions" | "needs">("actions");
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const open = actions.filter((action) => action.status !== "done");
  const done = actions.filter((action) => action.status === "done");
  const unresolved = needs.filter((need) => need.status !== "confirmed");

  const patch = (id: string, change: Parameters<typeof updateAction>[4]) =>
    startTransition(async () => {
      const outcome = await updateAction(
        route.clientSlug, route.eventSlug, route.edition, id, change,
      );
      if (!outcome.ok) setFailure(outcome.message ?? "That did not save.");
      else setFailure(null);
    });

  const row = (action: Action) => (
    <li key={action.id} className={`ws-row ${action.status === "done" ? "ws-row-done" : ""}`}>
      <button
        type="button"
        className="ws-check"
        aria-pressed={action.status === "done"}
        aria-label={action.status === "done" ? "Reopen" : "Mark done"}
        disabled={!planner}
        onClick={() => patch(action.id, { status: action.status === "done" ? "todo" : "done" })}
      >
        {action.status === "done" ? "✓" : ""}
      </button>
      <div className="ws-row-main">
        {planner ? (
          <input
            className="ws-row-title"
            defaultValue={action.title}
            maxLength={200}
            onBlur={(event) => {
              if (event.target.value.trim() !== action.title) {
                patch(action.id, { title: event.target.value });
              }
            }}
          />
        ) : (
          <span className="ws-row-title">{action.title}</span>
        )}
        {action.from ? (
          <Link className="ws-row-from" href={action.from.href}>
            For: {action.from.label}
          </Link>
        ) : null}
      </div>
      {planner ? (
        <input
          className="ws-row-owner"
          defaultValue={action.owner ?? ""}
          placeholder="Owner"
          maxLength={80}
          onBlur={(event) => {
            if (event.target.value.trim() !== (action.owner ?? "")) {
              patch(action.id, { owner: event.target.value });
            }
          }}
        />
      ) : (
        <span className="ws-row-owner">{action.owner ?? ""}</span>
      )}
      {planner ? (
        <input
          className={`ws-row-due ${overdue(action.due) && action.status !== "done" ? "ws-due-late" : ""}`}
          type="date"
          defaultValue={action.due ?? ""}
          onChange={(event) => patch(action.id, { due: event.target.value })}
        />
      ) : (
        <span className="ws-row-due">{dueLabel(action.due) ?? ""}</span>
      )}
    </li>
  );

  return (
    <>
      <div className="ws-bar">
        <div className="ws-seg-tabs" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={lens === "actions"} onClick={() => setLens("actions")}>
            Actions {open.length > 0 ? <em>{open.length}</em> : null}
          </button>
          <button type="button" role="tab" aria-selected={lens === "needs"} onClick={() => setLens("needs")}>
            Needs {unresolved.length > 0 ? <em>{unresolved.length}</em> : null}
          </button>
        </div>
        <div className="ws-bar-right">
          {failure ? <span className="ws-failure" role="status">{failure}</span> : null}
        </div>
      </div>

      {lens === "actions" ? (
        <>
          {planner ? <QuickAddAction route={route} /> : null}
          {open.length > 0 ? (
            <ul className="ws-rows">{open.map(row)}</ul>
          ) : (
            <p className="ws-empty">Nothing open.</p>
          )}
          {done.length > 0 ? (
            <>
              <p className="ws-panel-sub ws-done-head">Done · {done.length}</p>
              <ul className="ws-rows">{done.map(row)}</ul>
            </>
          ) : null}
        </>
      ) : (
        <>
          {planner ? <QuickAddNeed route={route} /> : null}
          {needs.length > 0 ? (
            <ul className="ws-rows">
              {needs.map((need) => (
                <li key={need.id} className="ws-row">
                  <span className={`ws-need-dot ws-need-${need.status}`} aria-hidden="true" />
                  <div className="ws-row-main">
                    <span className="ws-row-title">{need.name}</span>
                    {need.from ? (
                      <Link className="ws-row-from" href={need.from.href}>
                        For: {need.from.label}
                      </Link>
                    ) : null}
                  </div>
                  <span className="ws-row-owner">{need.kind}</span>
                  {planner ? (
                    <select
                      className="ws-row-due"
                      defaultValue={need.status}
                      onChange={(event) =>
                        startTransition(async () => {
                          await setNeedStatus(
                            route.clientSlug, route.eventSlug, route.edition,
                            need.id, event.target.value,
                          );
                        })
                      }
                    >
                      <option value="needed">Needed</option>
                      <option value="holding">Holding</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  ) : (
                    <span className="ws-row-due">{need.status}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ws-empty">Nothing needed yet.</p>
          )}
        </>
      )}
    </>
  );
}

function QuickAddAction({ route }: { route: Route }) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="ws-quickrow"
      action={() =>
        startTransition(async () => {
          if (!title.trim()) return;
          const fields = { title, owner, due };
          setTitle(""); setOwner(""); setDue("");
          await addAction(route.clientSlug, route.eventSlug, route.edition, fields);
        })
      }
    >
      <input
        className="ws-row-title"
        value={title}
        placeholder="What needs to happen?"
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        className="ws-row-owner"
        value={owner}
        placeholder="Owner"
        maxLength={80}
        onChange={(event) => setOwner(event.target.value)}
      />
      <input
        className="ws-row-due"
        type="date"
        value={due}
        onChange={(event) => setDue(event.target.value)}
      />
      <button type="submit" className="ws-btn" disabled={pending || !title.trim()}>Add</button>
    </form>
  );
}

function QuickAddNeed({ route }: { route: Route }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("supply");
  const [cost, setCost] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="ws-quickrow"
      action={() =>
        startTransition(async () => {
          if (!name.trim()) return;
          const fields = { name, kind, cost };
          setName(""); setCost("");
          await addNeed(route.clientSlug, route.eventSlug, route.edition, fields);
        })
      }
    >
      <input
        className="ws-row-title"
        value={name}
        placeholder="What is needed?"
        maxLength={200}
        onChange={(event) => setName(event.target.value)}
      />
      <select className="ws-row-owner" value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="person">Person</option>
        <option value="vendor">Vendor</option>
        <option value="equipment">Equipment</option>
        <option value="supply">Supply</option>
        <option value="deliverable">Deliverable</option>
      </select>
      <input
        className="ws-row-due"
        value={cost}
        inputMode="decimal"
        placeholder="Cost"
        onChange={(event) => setCost(event.target.value)}
      />
      <button type="submit" className="ws-btn" disabled={pending || !name.trim()}>Add</button>
    </form>
  );
}
