import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Budget" };

/**
 * The money, in the shape of the sheet it came from.
 *
 * Five figures across the top and then the lines themselves. Costs recorded
 * on a need or an action are counted here too, so a number typed once in the
 * plan shows up in the total without anyone entering it twice, and appears
 * under "From the plan" so it is obvious where it came from.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);

const STANDING: Record<string, string> = {
  estimate: "Estimate",
  discuss: "Discuss",
  protected: "Protected",
  committed: "Committed",
};

export default async function BudgetPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const engagementId = context.engagement.id;
  const [linesQ, needsQ, actionsQ] = await Promise.all([
    context.supabase
      .from("budget_lines")
      .select("id, category, label, planned_cents, committed_cents, actual_cents, status, note")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("resources")
      .select("id, name, kind, estimated_cents, committed_cents, actual_cents")
      .eq("engagement_id", engagementId)
      .or("estimated_cents.gt.0,committed_cents.gt.0,actual_cents.gt.0"),
    context.supabase
      .from("tasks")
      .select("id, title, estimated_cents, committed_cents, actual_cents")
      .eq("engagement_id", engagementId)
      .or("estimated_cents.gt.0,committed_cents.gt.0,actual_cents.gt.0"),
  ]);

  type Line = {
    id: string; category: string; label: string;
    planned_cents: number; committed_cents: number; actual_cents: number;
    status: string | null; note: string | null;
  };
  const lines = (linesQ.data ?? []) as Line[];

  const fromPlan = [
    ...((needsQ.data ?? []) as Array<{ id: string; name: string; kind: string; estimated_cents: number; committed_cents: number; actual_cents: number }>)
      .map((row) => ({
        id: `n-${row.id}`, label: row.name, kind: `Need · ${row.kind}`,
        estimated_cents: row.estimated_cents, committed_cents: row.committed_cents, actual_cents: row.actual_cents,
      })),
    ...((actionsQ.data ?? []) as Array<{ id: string; title: string; estimated_cents: number; committed_cents: number; actual_cents: number }>)
      .map((row) => ({
        id: `a-${row.id}`, label: row.title, kind: "Action",
        estimated_cents: row.estimated_cents, committed_cents: row.committed_cents, actual_cents: row.actual_cents,
      })),
  ];

  const working =
    lines.reduce((total, row) => total + row.planned_cents, 0) +
    fromPlan.reduce((total, row) => total + row.estimated_cents, 0);
  const committed =
    lines.reduce((total, row) => total + row.committed_cents, 0) +
    fromPlan.reduce((total, row) => total + row.committed_cents, 0);
  const spent =
    lines.reduce((total, row) => total + row.actual_cents, 0) +
    fromPlan.reduce((total, row) => total + row.actual_cents, 0);
  const ceiling = context.engagement.budgetTotalCents;
  const remaining = ceiling - working;

  const categories = [...new Set(lines.map((row) => row.category))];

  return (
    <>
      <h2 className="ws-title">Budget</h2>

      <dl className="ws-figures">
        <div><dt>Budget</dt><dd>{money(ceiling)}</dd></div>
        <div><dt>Working</dt><dd>{money(working)}</dd></div>
        <div><dt>Committed</dt><dd>{money(committed)}</dd></div>
        <div><dt>Spent</dt><dd>{money(spent)}</dd></div>
        <div className={remaining < 0 ? "ws-fig-over" : ""}>
          <dt>{remaining < 0 ? "Over" : "Remaining"}</dt>
          <dd>{money(Math.abs(remaining))}</dd>
        </div>
      </dl>

      <table className="ws-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Item</th>
            <th className="ws-num">Working</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <Fragment key={category}>
              {lines.filter((row) => row.category === category).map((row, index) => (
                <tr key={row.id}>
                  <td className="ws-cat">{index === 0 ? category : ""}</td>
                  <td>
                    {row.label}
                    {row.note ? <span className="ws-cell-note">{row.note}</span> : null}
                  </td>
                  <td className="ws-num">
                    {row.planned_cents > 0 ? money(row.planned_cents) : <span className="ws-tbd">TBD</span>}
                  </td>
                  <td>
                    <span className={`ws-standing ws-standing-${row.status ?? "estimate"}`}>
                      {STANDING[row.status ?? "estimate"] ?? row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
          {fromPlan.map((row) => (
            <tr key={row.id}>
              <td className="ws-cat">From the plan</td>
              <td>{row.label}<span className="ws-cell-note">{row.kind}</span></td>
              <td className="ws-num">{money(row.estimated_cents)}</td>
              <td><span className="ws-standing ws-standing-estimate">Estimate</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Working total</td>
            <td className="ws-num">{money(working)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </>
  );
}
