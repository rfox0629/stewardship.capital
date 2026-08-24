import Link from "next/link";
import { notFound } from "next/navigation";

import { NodeState, type NodeStateKind } from "@spark/_components/node-state";
import { Panel, Stat, Workflow } from "@spark/_components/ui";
import { shortDate } from "@spark/_lib/format";
import { editionPath } from "@spark/_lib/paths";
import type { EditionRouteParams } from "@spark/_lib/paths";
import {
  personById,
  resolveEdition,
  taskCounts,
  tasksFor,
} from "@spark/_lib/store";
import type { TaskStatus } from "@spark/_lib/types";

export const metadata = { title: "Tasks" };

const order: TaskStatus[] = ["blocked", "doing", "todo", "done"];

const label: Record<TaskStatus, string> = {
  blocked: "Blocked",
  doing: "In progress",
  todo: "Not started",
  done: "Done",
};

/* Hollow is open, filled is settled, orange is live. */
const node: Record<TaskStatus, NodeStateKind> = {
  blocked: "open",
  doing: "open",
  todo: "latent",
  done: "settled",
};

type PageProps = { params: Promise<EditionRouteParams> };

export default async function TasksPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const { client, event, edition } = resolved;
  const tasks = tasksFor(edition.id);
  const counts = taskCounts(edition.id);
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <div className="eo-page-head">
          <p className="eo-eyebrow">Tasks and owners</p>
          <h1>{counts.open} open, {counts.blocked} blocked.</h1>
          <p>Grouped by state, because the only urgent question is what is stuck.</p>
        </div>

        <Workflow here="Build" />

        <dl className="eo-stats">
          <Stat label="Total" value={String(counts.total)} />
          <Stat label="Open" value={String(counts.open)} />
          <Stat label="Blocked" value={String(counts.blocked)} note="Needs a decision" />
          <Stat label="Done" value={String(counts.done)} />
        </dl>

        <div className="eo-grid">
          {tasks.length === 0 ? (
            <Panel title="No tasks yet">
              <p>
                Tasks appear here when a spark is approved or when someone adds
                one directly. This edition has none recorded.
              </p>
            </Panel>
          ) : null}
          {order.map((status) => {
            const group = tasks.filter((task) => task.status === status);
            if (group.length === 0) return null;
            return (
              <Panel key={status} title={label[status]} flush>
                <ul className="eo-rows">
                  {group.map((task) => (
                    <li key={task.id}>
                      <div className="eo-row-main">
                        <div className="eo-row-title">{task.title}</div>
                        <p className="eo-row-meta">
                          {personById(task.ownerId).name}. Due {shortDate(task.due)}.{" "}
                          {task.area}.
                          {task.sparkId ? (
                            <>
                              {" "}
                              <Link
                                className="eo-panel-link"
                                href={`${base("sparks")}/${task.sparkId}`}
                              >
                                from a spark
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="eo-row-side">
                        <NodeState kind={node[status]} label={label[status]} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      </div>
    </main>
  );
}
