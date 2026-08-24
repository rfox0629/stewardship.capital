"use client";

import Link from "next/link";
import { useState } from "react";

import type { Spark, SparkCategory, SparkStatus } from "../_lib/types";
import { Pill } from "./ui";

const columns: Array<{ status: SparkStatus; label: string; hint: string }> = [
  { status: "captured", label: "Captured", hint: "Written down, not yet discussed." },
  { status: "discussing", label: "Discussing", hint: "On a meeting agenda." },
  { status: "approved", label: "Approved", hint: "Built into the plan." },
  { status: "parked", label: "Parked", hint: "Good, not this edition." },
  { status: "declined", label: "Declined", hint: "Decided against, and why." },
];

const categories: SparkCategory[] = [
  "Program",
  "Hospitality",
  "Experience",
  "Communications",
  "Logistics",
  "Generosity",
];

const toneFor = (status: SparkStatus) =>
  status === "approved"
    ? "good"
    : status === "declined"
      ? "stop"
      : status === "discussing"
        ? "warn"
        : "neutral";

type SparksBoardProps = {
  sparks: Spark[];
  /** Route prefix for a single spark. Functions cannot cross the server
      boundary, so the board builds hrefs from a plain string. */
  sparkBase: string;
};

export function SparksBoard({ sparks, sparkBase }: SparksBoardProps) {
  const [added, setAdded] = useState<Spark[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState<SparkCategory>("Experience");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const all = [...added, ...sparks];

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
              Add to Captured
            </button>
            <p className="eo-note">
              Preview only. Nothing is saved, and nothing reaches the confirmed
              plan until it is approved.
            </p>
          </div>
        </form>
        <p aria-live="polite" className="eo-note" style={{ marginTop: 10 }}>
          {justAdded ? `Captured "${justAdded}". It is waiting for the next meeting.` : ""}
        </p>
      </div>

      {sparks.length === 0 && added.length === 0 ? (
        <p className="eo-note" style={{ marginBottom: 14 }}>
          No sparks recorded for this edition. Capture one above and it lands in
          Captured, where it waits for the next meeting.
        </p>
      ) : null}

      <div className="eo-board">
        {columns.map((column) => {
          const items = all.filter((spark) => spark.status === column.status);
          return (
            <section className="eo-column" key={column.status}>
              <div className="eo-column-head">
                <h2>{column.label}</h2>
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
                        <span className="eo-spark-cat">{spark.category}</span>
                        <Pill tone="accent">just added</Pill>
                      </div>
                    </div>
                  ) : (
                    <Link className="eo-spark" key={spark.id} href={`${sparkBase}/${spark.id}`}>
                      <h3>{spark.title}</h3>
                      <p>{spark.detail}</p>
                      <div className="eo-spark-foot">
                        <span className="eo-spark-cat">{spark.category}</span>
                        {spark.builds && spark.builds.length > 0 ? (
                          <Pill tone={toneFor(spark.status)}>
                            built {spark.builds.length}
                          </Pill>
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
