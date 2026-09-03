import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Budget" };

/**
 * The money, in the shape of the sheet it came from.
 *
 * Five figures across the top and then the lines themselves.
 *
 * Every cost in the product is a budget line, including the ones entered on
 * an idea, which carry that idea's id. Nothing else in the plan holds money:
 * an action can explain a cost and a requirement can be the reason for one,
 * but neither carries the number, so the same money cannot be counted twice.
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
  const [linesQ, ideasQ] = await Promise.all([
    context.supabase
      .from("budget_lines")
      .select("id, category, label, planned_cents, committed_cents, actual_cents, status, note, spark_id")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("sparks").select("id, title").eq("engagement_id", engagementId),
  ]);

  type Line = {
    id: string; category: string; label: string;
    planned_cents: number; committed_cents: number; actual_cents: number;
    status: string | null; note: string | null; spark_id: string | null;
  };
  const lines = (linesQ.data ?? []) as Line[];
  const ideaTitle = new Map((ideasQ.data ?? []).map((row) => [row.id, row.title]));

  const working = lines.reduce((total, row) => total + row.planned_cents, 0);
  const committed = lines.reduce((total, row) => total + row.committed_cents, 0);
  const spent = lines.reduce((total, row) => total + row.actual_cents, 0);
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
                    {row.spark_id && ideaTitle.has(row.spark_id) ? (
                      <span className="ws-cell-note">For: {ideaTitle.get(row.spark_id)}</span>
                    ) : null}
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
