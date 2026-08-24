import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";
import { TaskControl } from "./task-controls";

export const metadata = { title: "Tasks" };

/**
 * Follow through, after ideas are approved.
 *
 * Ordered by when things are due, because that is the question the weekly
 * meeting actually asks. A task that descends from a spark says so, which is
 * the difference between a to do list and a plan being carried out.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type TaskRow = {
  id: string;
  title: string;
  owner_name: string | null;
  due_on: string | null;
  status: string;
  area: string | null;
  spark: { title: string } | { title: string }[] | null;
};

const dueLabel = (value: string | null) => {
  if (!value) return null;
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const sparkTitle = (row: TaskRow) =>
  (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title;

export default async function TasksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const planner = context.role === "planner";
  const route = { clientSlug, eventSlug, edition };

  const { data } = await context.supabase
    .from("tasks")
    .select("id, title, owner_name, due_on, status, area, spark:sparks(title)")
    .eq("engagement_id", context.engagement.id)
    .order("due_on", { ascending: true, nullsFirst: false });

  const tasks = (data ?? []) as TaskRow[];
  const open = tasks.filter((task) => task.status !== "done");
  const done = tasks.filter((task) => task.status === "done");

  const row = (task: TaskRow, options: { muted?: boolean } = {}) => (
    <li key={task.id} className={options.muted ? "ev-muted" : undefined}>
      <p className="ev-row-kicker">
        {task.area ? <span>{task.area}</span> : null}
        {task.owner_name ? <span>{task.owner_name}</span> : null}
        {task.due_on ? <span>Due {dueLabel(task.due_on)}</span> : null}
      </p>
      <p className="ev-row-title">
        {task.title}
        {task.status === "blocked" ? (
          <span className="ev-pill ev-pill-deep">Blocked</span>
        ) : null}
        {task.status === "doing" ? (
          <span className="ev-pill ev-pill-good">In motion</span>
        ) : null}
      </p>
      {sparkTitle(task) ? (
        <p className="ev-row-became">From the spark: {sparkTitle(task)}</p>
      ) : null}
      {planner ? (
        <TaskControl {...route} taskId={task.id} done={task.status === "done"} />
      ) : null}
    </li>
  );

  return (
    <>
      <h2 className="ev-page-title">Tasks</h2>
      <p className="ev-lede">
        The follow through. What has to happen, who is carrying it, and when
        it is needed by.
      </p>

      <section className="ev-section" aria-label="Open tasks">
        <div className="ev-section-head">
          <h3 className="ev-section-title">In hand</h3>
          <span className="ev-section-note">
            {open.length === 0 ? "Nothing open" : `${open.length} open, by due date`}
          </span>
        </div>
        {open.length > 0 ? (
          <ul className="ev-rows">{open.map((task) => row(task))}</ul>
        ) : (
          <p className="ev-row-detail" style={{ paddingTop: 12 }}>
            Everything is settled. Enjoy it while it lasts.
          </p>
        )}
      </section>

      {done.length > 0 ? (
        <section className="ev-section" aria-label="Settled tasks">
          <div className="ev-section-head">
            <h3 className="ev-section-title">Settled</h3>
            <span className="ev-section-note">{done.length} done</span>
          </div>
          <ul className="ev-rows">
            {done.map((task) => row(task, { muted: true }))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
