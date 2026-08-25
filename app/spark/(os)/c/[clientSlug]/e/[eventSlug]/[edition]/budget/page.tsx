import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Budget" };

/**
 * The budget is the financial rollup of the plan, not a parallel ledger.
 *
 * Two kinds of money meet here: the engagement's fixed lines (venue, food,
 * contracted vendors), and costs carried by the plan itself, on the
 * resources and tasks that incur them. Nothing is entered twice: a cost
 * typed on a resource appears here because the resource carries it. The
 * question this page answers in the weekly meeting is "what have we
 * promised, and what room is left".
 *
 * Working members only. Stakeholders never reach this route, and even a
 * misrouted request would find that RLS returns them zero rows.
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

type CostRow = {
  id: string;
  label: string;
  sub: string | null;
  sparkTitle: string | null;
  estimated: number;
  committed: number;
  actual: number;
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

  const engagementId = context.engagement.id;
  const [linesQ, resourcesQ, tasksQ] = await Promise.all([
    context.supabase
      .from("budget_lines")
      .select(
        "id, category, label, planned_cents, committed_cents, actual_cents, owner_name, spark:sparks(title)",
      )
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("resources")
      .select("id, name, kind, owner_name, estimated_cents, committed_cents, actual_cents, spark:sparks(title)")
      .eq("engagement_id", engagementId)
      .or("estimated_cents.gt.0,committed_cents.gt.0,actual_cents.gt.0"),
    context.supabase
      .from("tasks")
      .select("id, title, owner_name, estimated_cents, committed_cents, actual_cents, spark:sparks(title)")
      .eq("engagement_id", engagementId)
      .or("estimated_cents.gt.0,committed_cents.gt.0,actual_cents.gt.0"),
  ]);

  const lines = (linesQ.data ?? []) as BudgetRow[];

  const planCosts: CostRow[] = [
    ...((resourcesQ.data ?? []) as Array<{
      id: string; name: string; kind: string; owner_name: string | null;
      estimated_cents: number; committed_cents: number; actual_cents: number;
      spark: { title: string } | { title: string }[] | null;
    }>).map((row) => ({
      id: `res-${row.id}`,
      label: row.name,
      sub: [`Resource · ${row.kind}`, row.owner_name].filter(Boolean).join(" · "),
      sparkTitle: (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title ?? null,
      estimated: row.estimated_cents,
      committed: row.committed_cents,
      actual: row.actual_cents,
    })),
    ...((tasksQ.data ?? []) as Array<{
      id: string; title: string; owner_name: string | null;
      estimated_cents: number; committed_cents: number; actual_cents: number;
      spark: { title: string } | { title: string }[] | null;
    }>).map((row) => ({
      id: `task-${row.id}`,
      label: row.title,
      sub: ["Task", row.owner_name].filter(Boolean).join(" · "),
      sparkTitle: (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title ?? null,
      estimated: row.estimated_cents,
      committed: row.committed_cents,
      actual: row.actual_cents,
    })),
  ];

  const planned =
    lines.reduce((sum, row) => sum + row.planned_cents, 0) +
    planCosts.reduce((sum, row) => sum + row.estimated, 0);
  const committed =
    lines.reduce((sum, row) => sum + row.committed_cents, 0) +
    planCosts.reduce((sum, row) => sum + row.committed, 0);
  const actual =
    lines.reduce((sum, row) => sum + row.actual_cents, 0) +
    planCosts.reduce((sum, row) => sum + row.actual, 0);
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
      <h2 className="ev-page-title">Budget</h2>
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
            <dt>{budget >= planned ? "Remaining" : "Over plan"}</dt>
            <dd>{money(Math.abs(budget - planned))}</dd>
          </div>
        </dl>
      </section>

      {planCosts.length > 0 ? (
        <section className="ev-section" aria-label="Costs carried by the plan">
          <div className="ev-section-head">
            <h3 className="ev-section-title">From the plan</h3>
            <span className="ev-section-note">
              {money(planCosts.reduce((sum, row) => sum + row.estimated, 0))} estimated,
              carried by resources and tasks
            </span>
          </div>
          <ul className="ev-rows">
            {planCosts.map((row) => (
              <li key={row.id}>
                <div className="ev-split">
                  <div>
                    <p className="ev-row-title">{row.label}</p>
                    {row.sub ? <p className="ev-row-detail">{row.sub}</p> : null}
                    {row.sparkTitle ? (
                      <p className="ev-row-became">From the spark: {row.sparkTitle}</p>
                    ) : null}
                  </div>
                  <div className="ev-figs">
                    <span className="ev-fig">
                      <span className="ev-fig-label">Estimated</span>
                      <b>{money(row.estimated)}</b>
                    </span>
                    {row.committed > 0 ? (
                      <span className="ev-fig">
                        <span className="ev-fig-label">Committed</span>
                        <b>{money(row.committed)}</b>
                      </span>
                    ) : null}
                    {row.actual > 0 ? (
                      <span className="ev-fig">
                        <span className="ev-fig-label">Spent</span>
                        <b>{money(row.actual)}</b>
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
