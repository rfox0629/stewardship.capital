"use client";

import { Fragment, useState, useTransition } from "react";

import {
  ALLOCATION_STATUS, PURCHASE_STATUS, childrenOf, eventTotals, keptValue,
  outsideTotals, type Kind, type Line,
} from "@lib/spark/budget";

import { addBudgetLine, deleteBudgetLine, updateBudgetLine } from "./actions";

/**
 * The money, and what is left of it afterwards.
 *
 * This screen answers two different stewardship questions and keeps them
 * apart. How much of the sixty thousand is this weekend using, and what is
 * SHINE still going to own in January. They are computed independently,
 * because a line can be either, both, or neither: food spends the budget and
 * is gone, an espresso machine spends it and is kept, a speaker paid for from
 * elsewhere is kept and spends none of it.
 *
 * A purchase named inside an allocation is detail about money already counted,
 * so it is drawn underneath its allocation and never added to the total again.
 * That is the one rule that makes $1,500 with a $750 machine inside it read as
 * $1,500 rather than $2,250.
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

/** Yes or no, asked plainly, with the consequence written underneath. */
function YesNo({
  name,
  legend,
  yes,
  no,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  yes: string;
  no: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="ws-line-field ws-line-wide">
      <span id={`${name}-legend`}>{legend}</span>
      <input type="hidden" name={name} value={value ? "yes" : "no"} />
      <div className="ws-yesno" role="group" aria-labelledby={`${name}-legend`}>
        <button type="button" aria-pressed={value} onClick={() => onChange(true)}>Yes</button>
        <button type="button" aria-pressed={!value} onClick={() => onChange(false)}>No</button>
      </div>
      <em className="ws-yesno-says">{value ? yes : no}</em>
    </div>
  );
}

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
  const [adding, setAdding] = useState<Kind | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const event = eventTotals(lines);
  const outside = outsideTotals(lines);
  const kept = keptValue(lines);
  const remaining = ceilingCents - event.planned;

  /* Anything a purchase could be detail about: a line that is not itself a
     detail, so the chain stays one deep in the interface. */
  const allocations = lines.filter((line) => line.parent_id === null && line.kind !== "purchase");

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

  /* --------------------------------------------------------------- a form */

  const form = (kind: Kind, line: Line | null) => (
    <LineForm
      key={line?.id ?? `new-${kind}`}
      kind={kind}
      line={line}
      allocations={allocations}
      pending={pending}
      onSubmit={(formData) =>
        run(
          () =>
            line
              ? updateBudgetLine(route.clientSlug, route.eventSlug, route.edition, line.id, formData)
              : addBudgetLine(route.clientSlug, route.eventSlug, route.edition, formData),
          () => { setEditing(null); setAdding(null); },
        )
      }
      onCancel={() => { setEditing(null); setAdding(null); setFailure(null); }}
      remove={line ? <Remove line={line} route={route} run={run} pending={pending} /> : null}
    />
  );

  /* -------------------------------------------------------------- the rows */

  const tag = (line: Line) => (
    <>
      {line.reusable ? (
        <span className="ws-tag ws-tag-kept" title={line.reuse_note ?? undefined}>Retained</span>
      ) : null}
      {!line.counts_toward_budget ? (
        <span className="ws-tag">Outside the budget</span>
      ) : null}
    </>
  );

  const detailRow = (line: Line, columns: number) =>
    editing === line.id ? (
      <tr key={line.id} className="ws-line-editing">
        <td colSpan={columns}>{form(line.kind === "purchase" ? "purchase" : "allocation", line)}</td>
      </tr>
    ) : (
      <tr key={line.id} className="ws-line-detail">
        <td className="ws-cat" />
        <td>
          <span className="ws-detail-mark" aria-hidden="true">&#8627;</span>
          {line.source_url ? (
            <a className="ws-line-link" href={line.source_url} target="_blank" rel="noreferrer noopener">
              {line.label}
            </a>
          ) : line.label}
          {tag(line)}
          <span className="ws-cell-note">Named inside the allocation above, not added to it.</span>
        </td>
        <td className="ws-num ws-cell-quiet">{line.planned_cents > 0 ? money(line.planned_cents) : ""}</td>
        <td>
          <span className={`ws-standing ws-standing-${line.status ?? "estimate"}`}>
            {statusLabel(line.status)}
          </span>
        </td>
        {planner ? (
          <td className="ws-num">
            <button type="button" className="ws-row-edit"
              onClick={() => { setEditing(line.id); setAdding(null); }}
              aria-label={`Edit ${line.label}`}>Edit</button>
          </td>
        ) : null}
      </tr>
    );

  /* ------------------------------------------------- what the weekend spends */

  const eventColumns = 4 + (planner ? 1 : 0);
  const spending = lines.filter((line) => line.parent_id === null && line.counts_toward_budget);
  const categories = [...new Set(spending.map((line) => line.category))];

  const eventTable = (
    <table className="ws-table ws-table-lines">
      <thead>
        <tr>
          <th>Category</th>
          <th>Item</th>
          <th className="ws-num">Planned</th>
          <th>Status</th>
          {planner ? <th className="ws-num" aria-label="Edit" /> : null}
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <Fragment key={category}>
            {spending.filter((line) => line.category === category).map((line, index) => (
              <Fragment key={line.id}>
                {editing === line.id ? (
                  <tr className="ws-line-editing">
                    <td colSpan={eventColumns}>
                      {form(line.kind === "purchase" ? "purchase" : "allocation", line)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="ws-cat">{index === 0 ? category : ""}</td>
                    <td>
                      {line.label}
                      {tag(line)}
                      {line.spark_id && ideaTitles[line.spark_id] ? (
                        <span className="ws-cell-note">For: {ideaTitles[line.spark_id]}</span>
                      ) : null}
                      {line.note ? <span className="ws-cell-note">{line.note}</span> : null}
                    </td>
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
                          aria-label={`Edit ${line.label}`}>Edit</button>
                      </td>
                    ) : null}
                  </tr>
                )}
                {childrenOf(lines, line.id).map((child) => detailRow(child, eventColumns))}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}>Planned against the {money(ceilingCents)}</td>
          <td className="ws-num">{money(event.planned)}</td>
          <td />
          {planner ? <td /> : null}
        </tr>
      </tfoot>
    </table>
  );

  /* ----------------------------------------------------- what has to be bought */

  const purchases = lines.filter((line) => line.kind === "purchase");
  const buyColumns = 6 + (planner ? 1 : 0);

  const purchaseTable = (
    <table className="ws-table ws-table-lines">
      <thead>
        <tr>
          <th>Item</th>
          <th>Assigned to</th>
          <th>From</th>
          <th className="ws-num">Planned</th>
          <th>Budget</th>
          <th>Status</th>
          {planner ? <th className="ws-num" aria-label="Edit" /> : null}
        </tr>
      </thead>
      <tbody>
        {purchases.map((line) => (
          editing === line.id ? (
            <tr key={line.id} className="ws-line-editing">
              <td colSpan={buyColumns}>{form("purchase", line)}</td>
            </tr>
          ) : (
            <tr key={line.id}>
              <td>
                {line.source_url ? (
                  <a className="ws-line-link" href={line.source_url} target="_blank" rel="noreferrer noopener">
                    {line.label}
                  </a>
                ) : line.label}
                {line.reusable ? (
                  <span className="ws-cell-note">
                    Retained{line.reuse_note ? ` · ${line.reuse_note}` : ""}
                  </span>
                ) : null}
                {line.note ? <span className="ws-cell-note">{line.note}</span> : null}
              </td>
              <td className="ws-cell-quiet">{line.owner_name ?? "TBD"}</td>
              <td className="ws-cell-quiet">{line.vendor ?? ""}</td>
              <td className="ws-num">
                {line.planned_cents > 0 ? money(line.planned_cents) : <span className="ws-tbd">TBD</span>}
              </td>
              <td className="ws-cell-quiet">
                {line.counts_toward_budget
                  ? line.parent_id
                    ? "Inside, within an allocation"
                    : "Inside the event budget"
                  : "Outside the event budget"}
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
                    aria-label={`Edit ${line.label}`}>Edit</button>
                </td>
              ) : null}
            </tr>
          )
        ))}
        {purchases.length === 0 ? (
          <tr><td colSpan={buyColumns} className="ws-cell-quiet">Nothing to buy yet.</td></tr>
        ) : null}
      </tbody>
      {purchases.length > 0 ? (
        <tfoot>
          <tr>
            <td colSpan={3}>To buy</td>
            <td className="ws-num">
              {money(purchases.reduce((sum, line) => sum + line.planned_cents, 0))}
            </td>
            <td className="ws-cell-quiet">{money(outside.planned)} outside</td>
            <td />
            {planner ? <td /> : null}
          </tr>
        </tfoot>
      ) : null}
    </table>
  );

  return (
    <>
      <h2 className="ws-title">Budget</h2>

      <dl className="ws-figures">
        <div><dt>Budget</dt><dd>{money(ceilingCents)}</dd></div>
        <div><dt>Planned</dt><dd>{money(event.planned)}</dd></div>
        <div><dt>Committed</dt><dd>{money(event.committed)}</dd></div>
        <div><dt>Spent</dt><dd>{money(event.spent)}</dd></div>
        <div className={remaining < 0 ? "ws-fig-over" : ""}>
          <dt>{remaining < 0 ? "Over" : "Remaining"}</dt>
          <dd>{money(Math.abs(remaining))}</dd>
        </div>
      </dl>

      {/* The second question. Not accounting: no depreciation, no useful life,
          no saving against renting. What SHINE still owns afterwards, and
          where that money came from. */}
      {kept.total > 0 ? (
        <div className="ws-kept">
          <p className="ws-kept-head">
            <b>Reusable value retained</b>
            <span>{money(kept.total)}</span>
          </p>
          <p className="ws-kept-split">
            {money(kept.insideBudget)} of it bought with the event budget,{" "}
            {money(kept.outsideBudget)} funded from elsewhere. Kept value does not change what
            the weekend is spending.
          </p>
          <ul className="ws-kept-list">
            {kept.lines.map((line) => (
              <li key={line.id}>
                <b>{line.label}</b>
                <span>{money(line.planned_cents)}</span>
                <em>
                  {line.counts_toward_budget ? "Included in event budget" : "Outside event budget"}
                  {line.reuse_note ? ` · ${line.reuse_note}` : ""}
                </em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failure ? <p className="ws-msg" role="status">{failure}</p> : null}

      <div className="ws-ledger-head">
        <h3 className="ws-ledger-title">Event budget</h3>
        <p className="ws-hint">
          What this weekend is spending against the {money(ceilingCents)}. A purchase named
          inside an allocation is detail, not more money.
        </p>
        {planner ? (
          <button type="button" className="ws-btn-quiet"
            onClick={() => { setAdding(adding === "allocation" ? null : "allocation"); setEditing(null); }}>
            {adding === "allocation" ? "Cancel" : "+ Add line"}
          </button>
        ) : null}
      </div>
      {adding === "allocation" ? <div className="ws-line-new">{form("allocation", null)}</div> : null}
      {eventTable}

      <div className="ws-ledger-head">
        <h3 className="ws-ledger-title">Purchases</h3>
        <p className="ws-hint">
          Things somebody has to go and buy for the weekend. Some come out of the event
          budget and some are funded elsewhere; each row says which.
        </p>
        {planner ? (
          <button type="button" className="ws-btn-quiet"
            onClick={() => { setAdding(adding === "purchase" ? null : "purchase"); setEditing(null); }}>
            {adding === "purchase" ? "Cancel" : "+ Add purchase"}
          </button>
        ) : null}
      </div>
      {adding === "purchase" ? <div className="ws-line-new">{form("purchase", null)}</div> : null}
      {purchaseTable}
    </>
  );
}

/**
 * Adding or changing one line.
 *
 * The two questions are asked outright, as yes or no, with the consequence
 * spelled out under each. Nobody has to know what a ledger is, and nothing
 * answers one question by reading the other.
 */
function LineForm({
  kind,
  line,
  allocations,
  pending,
  onSubmit,
  onCancel,
  remove,
}: {
  kind: Kind;
  line: Line | null;
  allocations: Line[];
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  remove: React.ReactNode;
}) {
  const [counts, setCounts] = useState(line ? line.counts_toward_budget : true);
  const [reusable, setReusable] = useState(line ? line.reusable : false);

  return (
    <form className="ws-line-form" action={onSubmit}>
      <input type="hidden" name="kind" value={kind} />
      <div className="ws-line-grid">
        <label className="ws-line-field ws-line-wide">
          <span>Item</span>
          <input name="label" defaultValue={line?.label ?? ""} required maxLength={160} autoFocus />
        </label>
        <label className="ws-line-field">
          <span>Category</span>
          <input name="category" defaultValue={line?.category ?? (kind === "purchase" ? "Equipment" : "")}
            maxLength={60} placeholder={kind === "purchase" ? "Equipment" : "Food"} />
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
          <select name="status" defaultValue={line?.status ?? (kind === "purchase" ? "to_buy" : "estimate")}>
            {(kind === "purchase" ? PURCHASE_STATUS : ALLOCATION_STATUS).map((value) => (
              <option key={value} value={value}>{STANDING[value]}</option>
            ))}
          </select>
        </label>

        <YesNo
          name="counts"
          legend="Counts toward the event budget"
          value={counts}
          onChange={setCounts}
          yes="It spends the weekend's money and shows in the remaining figure."
          no="Funded from somewhere else. It is still bought for the weekend, and it changes nothing at the top."
        />
        <YesNo
          name="reusable"
          legend="Reusable after the event"
          value={reusable}
          onChange={setReusable}
          yes="SHINE keeps it. Counted as retained value, which never changes what the weekend is spending."
          no="Used up by the weekend."
        />
        {reusable ? (
          <label className="ws-line-field ws-line-wide">
            <span>Where it goes afterwards, if you know</span>
            <input name="reuse_note" defaultValue={line?.reuse_note ?? ""} maxLength={200}
              placeholder="SHINE office and future events" />
          </label>
        ) : null}

        {kind === "purchase" ? (
          <>
            <label className="ws-line-field">
              <span>Assigned to</span>
              <input name="owner" defaultValue={line?.owner_name ?? ""} maxLength={120} placeholder="TBD" />
            </label>
            <label className="ws-line-field">
              <span>Purchase from</span>
              <input name="vendor" defaultValue={line?.vendor ?? ""} maxLength={120} placeholder="Online" />
            </label>
            <label className="ws-line-field">
              <span>Detail inside</span>
              <select name="parent" defaultValue={line?.parent_id ?? ""}>
                <option value="">Its own line</option>
                {allocations.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="ws-line-field ws-line-wide">
              <span>Purchase link</span>
              <input name="link" defaultValue={line?.source_url ?? ""} maxLength={500} placeholder="https://" />
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
        <button type="button" className="ws-btn-quiet" onClick={onCancel}>Cancel</button>
        {remove}
      </div>
    </form>
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
      <button type="button" className="ws-btn-danger" disabled={pending} onClick={() => setAsked(true)}>
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
