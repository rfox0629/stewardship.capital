"use client";

import { Fragment, useState, useTransition } from "react";

import {
  EQUIPMENT_STATUS, EVENT_STATUS, overlaps, totalsFor, type Ledger, type Line,
} from "@lib/spark/budget";

import { addBudgetLine, deleteBudgetLine, settleOverlap, updateBudgetLine } from "./actions";

/**
 * The money, in two pots.
 *
 * The event ledger is what producing this weekend costs, and it is the only
 * thing measured against the ceiling. The equipment ledger is what SHINE buys
 * for the weekend and keeps: planned and tracked here, deliberately outside
 * that ceiling, because a speaker they still own next year is not what this
 * weekend cost. Moving a line between them is one field, so the separation is
 * a decision a planner can change rather than a wall.
 *
 * Every total on the screen is summed from the lines underneath it. Nothing
 * keeps a number of its own, so no summary can drift away from what it is
 * summarising.
 */

type Route = { clientSlug: string; eventSlug: string; edition: string };

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);

const dollars = (cents: number) => (cents > 0 ? String(Math.round(cents / 100)) : "");

const STANDING: Record<string, string> = {
  estimate: "Estimate",
  discuss: "Discuss",
  protected: "Protected",
  committed: "Committed",
  to_buy: "Need to buy",
  ordered: "Ordered",
  received: "Received",
};

const statusLabel = (value: string | null) => STANDING[value ?? "estimate"] ?? value ?? "Estimate";

export function BudgetLedger({
  lines,
  ceilingCents,
  route,
  planner,
  ideaTitles,
}: {
  lines: Line[];
  ceilingCents: number;
  route: Route;
  planner: boolean;
  /** Costs entered on an idea carry it, so the line can say where it came from. */
  ideaTitles: Record<string, string>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<Ledger | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const event = totalsFor(lines, "event");
  const equipment = totalsFor(lines, "equipment");
  const remaining = ceilingCents - event.planned;
  const open = overlaps(lines);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done?: () => void) =>
    startTransition(async () => {
      const outcome = await fn();
      if (outcome.ok) {
        setFailure(null);
        done?.();
      } else {
        setFailure(outcome.message ?? "That did not save.");
      }
    });

  const inLedger = (ledger: Ledger) =>
    lines.filter((line) => (line.ledger === "equipment" ? "equipment" : "event") === ledger);

  /* --------------------------------------------------------------- a row */

  const form = (ledger: Ledger, line: Line | null) => (
    <form
      className="ws-line-form"
      action={(formData) =>
        run(
          () =>
            line
              ? updateBudgetLine(route.clientSlug, route.eventSlug, route.edition, line.id, formData)
              : addBudgetLine(route.clientSlug, route.eventSlug, route.edition, formData),
          () => { setEditing(null); setAdding(null); },
        )
      }
    >
      <input type="hidden" name="ledger" value={ledger} />
      <div className="ws-line-grid">
        <label className="ws-line-field ws-line-wide">
          <span>Item</span>
          <input name="label" defaultValue={line?.label ?? ""} required maxLength={160} autoFocus />
        </label>
        <label className="ws-line-field">
          <span>Category</span>
          <input
            name="category"
            defaultValue={line?.category ?? (ledger === "equipment" ? "Equipment" : "")}
            maxLength={60}
            placeholder={ledger === "equipment" ? "Equipment" : "Food"}
          />
        </label>
        <label className="ws-line-field">
          <span>Planned</span>
          <input name="planned" defaultValue={dollars(line?.planned_cents ?? 0)}
            inputMode="decimal" placeholder="750" />
        </label>
        <label className="ws-line-field">
          <span>Committed</span>
          <input name="committed" defaultValue={dollars(line?.committed_cents ?? 0)}
            inputMode="decimal" placeholder="0" />
        </label>
        <label className="ws-line-field">
          <span>Spent</span>
          <input name="actual" defaultValue={dollars(line?.actual_cents ?? 0)}
            inputMode="decimal" placeholder="0" />
        </label>
        <label className="ws-line-field">
          <span>Status</span>
          <select name="status" defaultValue={line?.status ?? (ledger === "equipment" ? "to_buy" : "estimate")}>
            {(ledger === "equipment" ? EQUIPMENT_STATUS : EVENT_STATUS).map((value) => (
              <option key={value} value={value}>{STANDING[value]}</option>
            ))}
          </select>
        </label>
        {ledger === "equipment" ? (
          <>
            <label className="ws-line-field">
              <span>Assigned to</span>
              <input name="owner" defaultValue={line?.owner_name ?? ""} maxLength={120} placeholder="TBD" />
            </label>
            <label className="ws-line-field">
              <span>Purchase from</span>
              <input name="vendor" defaultValue={line?.vendor ?? ""} maxLength={120} placeholder="Online" />
            </label>
            <label className="ws-line-field ws-line-wide">
              <span>Purchase link</span>
              <input name="link" defaultValue={line?.source_url ?? ""} maxLength={500}
                placeholder="https://" />
            </label>
          </>
        ) : null}
        <label className="ws-line-field ws-line-wide">
          <span>Note</span>
          <input name="note" defaultValue={line?.note ?? ""} maxLength={400} />
        </label>
      </div>
      <div className="ws-line-actions">
        <button type="submit" className="ws-btn" disabled={pending}>
          {pending ? "Saving" : line ? "Save" : "Add"}
        </button>
        <button type="button" className="ws-btn-quiet"
          onClick={() => { setEditing(null); setAdding(null); setFailure(null); }}>
          Cancel
        </button>
        {line ? <Remove line={line} route={route} run={run} pending={pending} /> : null}
      </div>
    </form>
  );

  const table = (ledger: Ledger) => {
    const rows = inLedger(ledger);
    const categories = [...new Set(rows.map((line) => line.category))];
    const totals = ledger === "event" ? event : equipment;
    /* Category, item, planned, status, plus equipment's two and the edit. */
    const columns = 4 + (ledger === "equipment" ? 2 : 0) + (planner ? 1 : 0);

    return (
      <table className="ws-table ws-table-lines">
        <thead>
          <tr>
            <th>Category</th>
            <th>Item</th>
            {ledger === "equipment" ? <th>Assigned to</th> : null}
            {ledger === "equipment" ? <th>From</th> : null}
            <th className="ws-num">Planned</th>
            <th>Status</th>
            {planner ? <th className="ws-num" aria-label="Edit" /> : null}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <Fragment key={category}>
              {rows.filter((line) => line.category === category).map((line, index) => (
                editing === line.id ? (
                  <tr key={line.id} className="ws-line-editing">
                    <td colSpan={columns}>
                      {form(ledger, line)}
                    </td>
                  </tr>
                ) : (
                  <tr key={line.id}>
                    <td className="ws-cat">{index === 0 ? category : ""}</td>
                    <td>
                      {line.source_url ? (
                        <a className="ws-line-link" href={line.source_url}
                          target="_blank" rel="noreferrer noopener">{line.label}</a>
                      ) : line.label}
                      {line.spark_id && ideaTitles[line.spark_id] ? (
                        <span className="ws-cell-note">For: {ideaTitles[line.spark_id]}</span>
                      ) : null}
                      {line.note ? <span className="ws-cell-note">{line.note}</span> : null}
                    </td>
                    {ledger === "equipment" ? (
                      <td className="ws-cell-quiet">{line.owner_name ?? "TBD"}</td>
                    ) : null}
                    {ledger === "equipment" ? (
                      <td className="ws-cell-quiet">{line.vendor ?? ""}</td>
                    ) : null}
                    <td className="ws-num">
                      {line.planned_cents > 0 ? money(line.planned_cents) : <span className="ws-tbd">TBD</span>}
                    </td>
                    <td>
                      <span className={`ws-standing ws-standing-${line.status ?? "estimate"}`}>
                        {statusLabel(line.status)}
                      </span>
                    </td>
                    {planner ? (
                      <td className="ws-num">
                        <button type="button" className="ws-row-edit"
                          onClick={() => { setEditing(line.id); setAdding(null); }}
                          aria-label={`Edit ${line.label}`}>
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                )
              ))}
            </Fragment>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns} className="ws-cell-quiet">
                {ledger === "equipment"
                  ? "Nothing being bought and kept yet."
                  : "No lines yet."}
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={ledger === "equipment" ? 4 : 2}>
              {ledger === "equipment" ? "Equipment planned total" : "Working total"}
            </td>
            <td className="ws-num">{money(totals.planned)}</td>
            <td />
            {planner ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    );
  };

  return (
    <>
      <h2 className="ws-title">Budget</h2>

      <dl className="ws-figures">
        <div><dt>Budget</dt><dd>{money(ceilingCents)}</dd></div>
        <div><dt>Working</dt><dd>{money(event.planned)}</dd></div>
        <div><dt>Committed</dt><dd>{money(event.committed)}</dd></div>
        <div><dt>Spent</dt><dd>{money(event.spent)}</dd></div>
        <div className={remaining < 0 ? "ws-fig-over" : ""}>
          <dt>{remaining < 0 ? "Over" : "Remaining"}</dt>
          <dd>{money(Math.abs(remaining))}</dd>
        </div>
      </dl>

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}

      {/* Two lines that might be the same money. Nothing is adjusted and
          nothing is removed; the pairing is here so somebody can say which. */}
      {open.length > 0 ? (
        <div className="ws-overlap">
          {open.map(({ line, against }) => (
            <div key={line.id} className="ws-overlap-row">
              <p>
                <b>{line.label}</b> at {money(line.planned_cents)} is being kept, so it sits in
                Equipment and is not in the {money(ceilingCents)} event total. It may already be
                inside <b>{against.label}</b> at {money(against.planned_cents)}, which is unchanged.
                Does it still stand at {money(against.planned_cents)} without it?
              </p>
              {planner ? (
                <button type="button" className="ws-btn-quiet" disabled={pending}
                  onClick={() =>
                    run(() => settleOverlap(route.clientSlug, route.eventSlug, route.edition, line.id))}>
                  Settled
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="ws-ledger-head">
        <h3 className="ws-ledger-title">The weekend</h3>
        <p className="ws-hint">What producing these four days costs. This is the {money(ceilingCents)}.</p>
        {planner ? (
          <button type="button" className="ws-btn-quiet"
            onClick={() => { setAdding(adding === "event" ? null : "event"); setEditing(null); }}>
            {adding === "event" ? "Cancel" : "+ Add line"}
          </button>
        ) : null}
      </div>
      {adding === "event" ? <div className="ws-line-new">{form("event", null)}</div> : null}
      {table("event")}

      <div className="ws-ledger-head">
        <h3 className="ws-ledger-title">Equipment and purchases</h3>
        <p className="ws-hint">
          Bought for the weekend and kept afterwards, so it is planned here and stays out of
          the event total.
        </p>
        {planner ? (
          <button type="button" className="ws-btn-quiet"
            onClick={() => { setAdding(adding === "equipment" ? null : "equipment"); setEditing(null); }}>
            {adding === "equipment" ? "Cancel" : "+ Add purchase"}
          </button>
        ) : null}
      </div>
      {adding === "equipment" ? <div className="ws-line-new">{form("equipment", null)}</div> : null}
      {table("equipment")}
    </>
  );
}

/**
 * Removing a line, with the pause a delete deserves.
 *
 * It asks once, in place, and says what is going. Anything else on this
 * screen can be typed back; this cannot.
 */
function Remove({
  line,
  route,
  run,
  pending,
}: {
  line: Line;
  route: Route;
  run: (fn: () => Promise<{ ok: boolean; message?: string }>, done?: () => void) => void;
  pending: boolean;
}) {
  const [asked, setAsked] = useState(false);

  if (!asked) {
    return (
      <button type="button" className="ws-btn-danger" disabled={pending}
        onClick={() => setAsked(true)}>
        Remove
      </button>
    );
  }

  return (
    <span className="ws-confirm-inline">
      <b>Remove {line.label}?</b>
      <button type="button" className="ws-btn-danger" disabled={pending}
        onClick={() => run(() => deleteBudgetLine(route.clientSlug, route.eventSlug, route.edition, line.id))}>
        {pending ? "Removing" : "Yes, remove it"}
      </button>
      <button type="button" className="ws-btn-quiet" onClick={() => setAsked(false)}>Keep it</button>
    </span>
  );
}
