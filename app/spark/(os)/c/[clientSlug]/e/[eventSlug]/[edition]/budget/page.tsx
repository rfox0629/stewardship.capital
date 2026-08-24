import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Budget" };

/**
 * The budget, as a working document rather than a ledger.
 *
 * Three figures per line, planned, committed, and spent, each carrying its
 * own label so nothing has to be cross referenced against a header row. The
 * question this page exists to answer in the weekly meeting is not "is the
 * bookkeeping right" but "what have we promised, and what room is left".
 *
 * Working members only. Stakeholders never reach this route, and even a
 * misrouted request would find that RLS returns them zero budget rows.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type BudgetRow = {
  id: string;
  category: string;
  label: string;
  planned_cents: number;
  committed_cents: number;
  actual_cents: number;
  owner_name: string | null;
  spark: { title: string } | { title: string }[] | null;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const sparkTitle = (row: BudgetRow) =>
  (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title;

export default async function BudgetPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { data } = await context.supabase
    .from("budget_lines")
    .select(
      "id, category, label, planned_cents, committed_cents, actual_cents, owner_name, spark:sparks(title)",
    )
    .eq("engagement_id", context.engagement.id)
    .order("created_at", { ascending: true });

  const lines = (data ?? []) as BudgetRow[];

  const total = (pick: (row: BudgetRow) => number) =>
    lines.reduce((sum, row) => sum + pick(row), 0);

  const planned = total((row) => row.planned_cents);
  const committed = total((row) => row.committed_cents);
  const actual = total((row) => row.actual_cents);
  const budget = context.engagement.budgetTotalCents;

  const categories = [...new Set(lines.map((row) => row.category))].map(
    (category) => {
      const rows = lines.filter((row) => row.category === category);
      return {
        category,
        rows,
        planned: rows.reduce((sum, row) => sum + row.planned_cents, 0),
      };
    },
  );

  return (
    <>
      <h2 className="ev-page-title">The budget</h2>
      <p className="ev-lede">
        {money(budget)} for the weekend. Committed is what has been promised
        to someone; spent is what has actually left.
      </p>

      <section className="ev-section" aria-label="Where the budget stands">
        <div className="ev-section-head">
          <h3 className="ev-section-title">Where it stands</h3>
        </div>
        <dl className="ev-glance">
          <div>
            <dt>Budget</dt>
            <dd>{money(budget)}</dd>
          </div>
          <div>
            <dt>Planned</dt>
            <dd>{money(planned)}</dd>
          </div>
          <div>
            <dt>Committed</dt>
            <dd>{money(committed)}</dd>
          </div>
          <div>
            <dt>Spent</dt>
            <dd>{money(actual)}</dd>
          </div>
          <div>
            <dt>{budget >= planned ? "Unplanned" : "Over plan"}</dt>
            <dd>{money(Math.abs(budget - planned))}</dd>
          </div>
        </dl>
      </section>

      {categories.map(({ category, rows, planned: categoryPlanned }) => (
        <section key={category} className="ev-section" aria-label={category}>
          <div className="ev-section-head">
            <h3 className="ev-section-title">{category}</h3>
            <span className="ev-section-note">
              {money(categoryPlanned)} planned
            </span>
          </div>
          <ul className="ev-rows">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="ev-split">
                  <div>
                    <p className="ev-row-title">{row.label}</p>
                    {row.owner_name ? (
                      <p className="ev-row-detail">{row.owner_name}</p>
                    ) : null}
                    {sparkTitle(row) ? (
                      <p className="ev-row-became">
                        From the spark: {sparkTitle(row)}
                      </p>
                    ) : null}
                  </div>
                  <div className="ev-figs">
                    <span className="ev-fig">
                      <span className="ev-fig-label">Planned</span>
                      <b>{money(row.planned_cents)}</b>
                    </span>
                    <span className="ev-fig">
                      <span className="ev-fig-label">Committed</span>
                      <b>{money(row.committed_cents)}</b>
                    </span>
                    {row.actual_cents > 0 ? (
                      <span className="ev-fig">
                        <span className="ev-fig-label">Spent</span>
                        <b>{money(row.actual_cents)}</b>
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
