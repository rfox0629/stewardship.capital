"use client";

import Link from "next/link";
import { useState } from "react";

import type { Spark, SparkCategory, SparkStatus } from "../_lib/types";
import type { ViewerRole } from "../_lib/viewer";
import { NodeState, type NodeStateKind } from "./node-state";

type Column = {
  status: SparkStatus;
  label: string;
  hint: string;
  node: NodeStateKind;
};

/* One point commits, connects, and becomes a run. The node teaches the
   lifecycle by being the status, so no screen has to explain it. */
const plannerColumns: Column[] = [
  { status: "captured", label: "Captured", hint: "Written down, not yet discussed.", node: "latent" },
  { status: "discussing", label: "Discussing", hint: "On a meeting agenda.", node: "open" },
  { status: "approved", label: "Approved", hint: "Built into the plan.", node: "built" },
  { status: "parked", label: "Parked", hint: "Good, not this edition.", node: "closed" },
  { status: "declined", label: "Declined", hint: "Decided against, and why.", node: "closed" },
];

/**
 * What the client team sees.
 *
 * Three columns, not five. Parked and declined are where the planners' working
 * reasoning lives, and a client who reads every rejection starts relitigating
 * decisions rather than trusting them. What was decided still reaches them, in
 * the weekly meeting, from a person.
 */
const clientColumns: Column[] = [
  { status: "captured", label: "Submitted", hint: "With us. We review before the next meeting.", node: "latent" },
  { status: "discussing", label: "Under discussion", hint: "On this week's agenda together.", node: "open" },
  { status: "approved", label: "Settled", hint: "Approved and built into the plan.", node: "built" },
];

const categories: SparkCategory[] = [
  "Program",
  "Hospitality",
  "Experience",
  "Communications",
  "Logistics",
  "Generosity",
];

export const nodeForSpark = (spark: Spark): NodeStateKind => {
  if (spark.status === "approved") {
    return spark.builds && spark.builds.length > 0 ? "built" : "settled";
  }
  if (spark.status === "discussing") return "open";
  if (spark.status === "parked" || spark.status === "declined") return "closed";
  return "latent";
};

type SparksBoardProps = {
  sparks: Spark[];
  /** Route prefix for a single spark. Functions cannot cross the server
      boundary, so the board builds hrefs from a plain string. */
  sparkBase: string;
  viewer: ViewerRole;
};

export function SparksBoard({ sparks, sparkBase, viewer }: SparksBoardProps) {
  const [added, setAdded] = useState<Spark[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState<SparkCategory>("Experience");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const isPlanner = viewer === "planner";
  const columns = isPlanner ? plannerColumns : clientColumns;
  const visible = isPlanner
    ? sparks
    : sparks.filter((spark) =>
        clientColumns.some((column) => column.status === spark.status),
      );
  const all = [...added, ...visible];

  const submit = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const spark: Spark = {
      id: `sp-local-${added.length + 1}`,
      editionId: sparks[0]?.editionId ?? "preview",
      title: trimmed,
      detail: detail.trim() || "No detail yet.",
      category,
      status: "captured",
      raisedBy: "You",
      raisedOn: new Date().toISOString().slice(0, 10),
    };

    setAdded((current) => [spark, ...current]);
    setTitle("");
    setDetail("");
    setJustAdded(trimmed);
  };

  return (
    <>
      <div className="eo-quickadd" style={{ marginBottom: 20 }}>
        <form onSubmit={submit}>
          <div className="eo-field">
            <label htmlFor="spark-title">Capture a spark</label>
            <input
              id="spark-title"
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder="What if we..."
              autoComplete="off"
            />
          </div>
          <div className="eo-field">
            <label htmlFor="spark-detail">One line of detail</label>
            <input
              id="spark-detail"
              value={detail}
              onChange={(changeEvent) => setDetail(changeEvent.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          <div className="eo-field">
            <label htmlFor="spark-category">Area</label>
            <select
              id="spark-category"
              value={category}
              onChange={(changeEvent) =>
                setCategory(changeEvent.target.value as SparkCategory)
              }
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="eo-button" type="submit">
              {isPlanner ? "Add to Captured" : "Send it to us"}
            </button>
            <p className="eo-note">
              Preview only. Nothing is saved, and nothing reaches the confirmed
              plan until it is approved.
            </p>
          </div>
        </form>
        <p aria-live="polite" className="eo-note" style={{ marginTop: 10 }}>
          {justAdded
            ? isPlanner
              ? `Captured "${justAdded}". It is waiting for the next meeting.`
              : `Thanks. "${justAdded}" is with Brooke and Ryan for the next meeting.`
            : ""}
        </p>
      </div>

      {visible.length === 0 && added.length === 0 ? (
        <p className="eo-note" style={{ marginBottom: 14 }}>
          No sparks recorded for this edition. Capture one above and it lands in
          Captured, where it waits for the next meeting.
        </p>
      ) : null}

      {/* The client lens shows three columns, the planner five. The grid reads
          the count rather than assuming, so neither leaves dead space. */}
      <div className="eo-board" data-columns={columns.length}>
        {columns.map((column) => {
          const items = all.filter((spark) => spark.status === column.status);
          return (
            <section className="eo-column" key={column.status}>
              <div className="eo-column-head">
                <h2>
                  <NodeState kind={column.node} label={column.label} />
                  {column.label}
                </h2>
                <span className="eo-column-count">{items.length}</span>
              </div>
              <div className="eo-column-body">
                <p className="eo-note">{column.hint}</p>
                {items.map((spark) =>
                  spark.id.startsWith("sp-local-") ? (
                    <div className="eo-spark" key={spark.id}>
                      <h3>{spark.title}</h3>
                      <p>{spark.detail}</p>
                      <div className="eo-spark-foot">
                        <NodeState kind="latent" />
                        <span className="eo-spark-cat">{spark.category}</span>
                      </div>
                    </div>
                  ) : (
                    <Link className="eo-spark" key={spark.id} href={`${sparkBase}/${spark.id}`}>
                      <h3>{spark.title}</h3>
                      <p>{spark.detail}</p>
                      <div className="eo-spark-foot">
                        <NodeState kind={nodeForSpark(spark)} />
                        <span className="eo-spark-cat">{spark.category}</span>
                        {spark.builds && spark.builds.length > 0 ? (
                          <span className="eo-spark-built">
                            {spark.builds.length} built
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
