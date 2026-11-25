"use client";

import { useMemo, useState } from "react";

/**
 * The Ministry Impact Platform, working, on fixture data.
 *
 * Field reports come in; the executive view adds them up by region and
 * period. The dataset is generated here, in code, from a fixed seed: it is
 * the same every time, it names no real person or place of ministry, and
 * nothing on this screen reads or writes a database. A report added in the
 * demo lives in this component's state and is gone on reload.
 */

const REGIONS = ["East Africa", "South Asia", "Latin America", "United States"] as const;
type Region = (typeof REGIONS)[number];

const MINISTRIES = ["Evangelism", "Discipleship", "Training", "Partnership"] as const;
type Ministry = (typeof MINISTRIES)[number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PERIODS = [
  { key: "year", label: "Full year", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { key: "q1", label: "Q1", months: [0, 1, 2] },
  { key: "q2", label: "Q2", months: [3, 4, 5] },
  { key: "q3", label: "Q3", months: [6, 7, 8] },
  { key: "q4", label: "Q4", months: [9, 10, 11] },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

type Report = {
  id: string;
  month: number;
  region: Region;
  ministry: Ministry;
  outreaches: number;
  reached: number;
  decisions: number;
  followUps: number;
  demo: true;
};

/* A small deterministic generator, so the demo is identical on every visit. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const fixtureReports = (): Report[] => {
  const rand = seeded(20261125);
  const reports: Report[] = [];
  let n = 0;
  for (let month = 0; month < 12; month += 1) {
    for (const region of REGIONS) {
      const count = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < count; k += 1) {
        const ministry = MINISTRIES[Math.floor(rand() * MINISTRIES.length)];
        const outreaches = 1 + Math.floor(rand() * 6);
        const reached = outreaches * (20 + Math.floor(rand() * 90));
        const decisions = Math.floor(reached * (0.04 + rand() * 0.1));
        const followUps = Math.floor(decisions * (0.5 + rand() * 0.5));
        n += 1;
        reports.push({
          id: `demo-${n}`,
          month,
          region,
          ministry,
          outreaches,
          reached,
          decisions,
          followUps,
          demo: true,
        });
      }
    }
  }
  return reports;
};

const sum = (reports: Report[], key: keyof Pick<Report, "outreaches" | "reached" | "decisions" | "followUps">) =>
  reports.reduce((total, report) => total + report[key], 0);

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(value);

export function LiveDemo() {
  const [reports, setReports] = useState<Report[]>(() => fixtureReports());
  const [period, setPeriod] = useState<PeriodKey>("year");
  const [region, setRegion] = useState<Region | "all">("all");
  const [view, setView] = useState<"dashboard" | "summary">("dashboard");
  const [tableView, setTableView] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const months: readonly number[] = PERIODS.find((p) => p.key === period)!.months;

  const inScope = useMemo(
    () =>
      reports.filter(
        (report) =>
          months.includes(report.month) && (region === "all" || report.region === region),
      ),
    [months, region, reports],
  );

  const byMonth = useMemo(
    () =>
      MONTHS.map((_, month) =>
        sum(
          reports.filter(
            (report) => report.month === month && (region === "all" || report.region === region),
          ),
          "reached",
        ),
      ),
    [region, reports],
  );
  const maxMonth = Math.max(1, ...byMonth);

  const byRegion = useMemo(
    () =>
      REGIONS.map((name) => ({
        name,
        reached: sum(
          inScope.filter((report) => report.region === name),
          "reached",
        ),
        decisions: sum(
          inScope.filter((report) => report.region === name),
          "decisions",
        ),
      })),
    [inScope],
  );
  const maxRegion = Math.max(1, ...byRegion.map((row) => row.reached));

  const totals = {
    outreaches: sum(inScope, "outreaches"),
    reached: sum(inScope, "reached"),
    decisions: sum(inScope, "decisions"),
    followUps: sum(inScope, "followUps"),
  };

  const recent = [...inScope].sort((a, b) => b.month - a.month).slice(0, 6);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;
  const regionLabel = region === "all" ? "all regions" : region;

  const addReport = (formData: FormData) => {
    const reached = Math.max(0, Number(formData.get("reached")) || 0);
    const decisions = Math.min(reached, Math.max(0, Number(formData.get("decisions")) || 0));
    const report: Report = {
      id: `demo-new-${Date.now()}`,
      month: Number(formData.get("month")) || 0,
      region: (String(formData.get("region")) as Region) || REGIONS[0],
      ministry: (String(formData.get("ministry")) as Ministry) || MINISTRIES[0],
      outreaches: Math.max(1, Number(formData.get("outreaches")) || 1),
      reached,
      decisions,
      followUps: Math.min(decisions, Math.max(0, Number(formData.get("followUps")) || 0)),
      demo: true,
    };
    setReports((current) => [report, ...current]);
    setSaved(`${report.region}, ${MONTHS[report.month]}: ${fmt(report.reached)} reached.`);
  };

  return (
    <div className="dm" aria-label="Ministry Impact Platform demo">
      <div className="dm-banner" role="note">
        <span className="dm-banner-tag">Demo data</span>
        Fixture reports generated for this presentation. Nothing here is a ministry record.
      </div>

      <div className="dm-controls">
        <div className="dm-seg" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="dm-select">
          <span>Region</span>
          <select value={region} onChange={(event) => setRegion(event.target.value as Region | "all")}>
            <option value="all">All regions</option>
            {REGIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="dm-seg dm-seg-right" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "dashboard"} onClick={() => setView("dashboard")}>
            Dashboard
          </button>
          <button type="button" aria-pressed={view === "summary"} onClick={() => setView("summary")}>
            Executive summary
          </button>
        </div>
      </div>

      {view === "summary" ? (
        <article className="dm-summary">
          <p className="dm-summary-eyebrow">
            Executive summary · {periodLabel} · {regionLabel}
          </p>
          <h3>
            {fmt(totals.reached)} people reached through {fmt(totals.outreaches)} outreaches.
          </h3>
          <p>
            Across {regionLabel}, the field reported {fmt(totals.decisions)} decisions, of which{" "}
            {fmt(totals.followUps)} are in active follow up
            {totals.decisions > 0
              ? ` (${Math.round((totals.followUps / totals.decisions) * 100)}%)`
              : ""}
            . {byRegion.slice().sort((a, b) => b.reached - a.reached)[0]?.name} led the period in
            people reached. {inScope.length} field reports are behind these figures, each one
            traceable to the team that filed it.
          </p>
          <p className="dm-summary-note">
            This page is generated from the reports as they stand. It is the view a board packet
            would carry, without anyone compiling it.
          </p>
        </article>
      ) : (
        <>
          <div className="dm-kpis">
            <div className="dm-kpi">
              <span className="dm-kpi-value">{fmt(totals.reached)}</span>
              <span className="dm-kpi-label">People reached</span>
            </div>
            <div className="dm-kpi">
              <span className="dm-kpi-value">{fmt(totals.outreaches)}</span>
              <span className="dm-kpi-label">Outreaches</span>
            </div>
            <div className="dm-kpi">
              <span className="dm-kpi-value">{fmt(totals.decisions)}</span>
              <span className="dm-kpi-label">Decisions</span>
            </div>
            <div className="dm-kpi">
              <span className="dm-kpi-value">{fmt(totals.followUps)}</span>
              <span className="dm-kpi-label">In follow up</span>
            </div>
          </div>

          <div className="dm-grid">
            <figure className="dm-chart">
              <figcaption className="dm-chart-head">
                <span>People reached by month, {regionLabel}</span>
                <button type="button" className="dm-link" onClick={() => setTableView((v) => !v)}>
                  {tableView ? "Show chart" : "Show as table"}
                </button>
              </figcaption>

              {tableView ? (
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">People reached</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((name, month) => (
                      <tr key={name} data-dim={!months.includes(month)}>
                        <th scope="row">{name}</th>
                        <td>{fmt(byMonth[month])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="dm-bars" role="img" aria-label={`People reached by month, ${regionLabel}`}>
                  {MONTHS.map((name, month) => {
                    const value = byMonth[month];
                    const height = Math.max(2, Math.round((value / maxMonth) * 100));
                    const dim = !months.includes(month);
                    return (
                      <div
                        key={name}
                        className="dm-bar-col"
                        data-dim={dim}
                        data-hover={hover === month}
                        onMouseEnter={() => setHover(month)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(month)}
                        onBlur={() => setHover(null)}
                        tabIndex={0}
                      >
                        {hover === month ? (
                          <span className="dm-tip" role="tooltip">
                            {name}: {fmt(value)}
                          </span>
                        ) : null}
                        <span className="dm-bar" style={{ height: `${height}%` }} />
                        <span className="dm-bar-label">{name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </figure>

            <div className="dm-regions">
              <p className="dm-chart-head">
                <span>By region, {periodLabel}</span>
              </p>
              <ul className="dm-region-list">
                {byRegion.map((row) => (
                  <li key={row.name}>
                    <span className="dm-region-name">{row.name}</span>
                    <span className="dm-region-bar" aria-hidden="true">
                      <span style={{ width: `${Math.round((row.reached / maxRegion) * 100)}%` }} />
                    </span>
                    <span className="dm-region-value">
                      {fmt(row.reached)} <span className="dm-muted">reached</span> · {fmt(row.decisions)}{" "}
                      <span className="dm-muted">decisions</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="dm-grid dm-grid-bottom">
            <form
              className="dm-form"
              action={(formData) => addReport(formData)}
              aria-label="Add a field report"
            >
              <p className="dm-chart-head">
                <span>File a field report</span>
                <span className="dm-muted">demo only</span>
              </p>
              <div className="dm-form-grid">
                <label>
                  <span>Region</span>
                  <select name="region" defaultValue={REGIONS[0]}>
                    {REGIONS.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Month</span>
                  <select name="month" defaultValue={months[months.length - 1]}>
                    {MONTHS.map((name, month) => (
                      <option key={name} value={month}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Ministry</span>
                  <select name="ministry" defaultValue={MINISTRIES[0]}>
                    {MINISTRIES.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Outreaches</span>
                  <input name="outreaches" type="number" min={1} defaultValue={2} />
                </label>
                <label>
                  <span>People reached</span>
                  <input name="reached" type="number" min={0} defaultValue={120} />
                </label>
                <label>
                  <span>Decisions</span>
                  <input name="decisions" type="number" min={0} defaultValue={9} />
                </label>
                <label>
                  <span>In follow up</span>
                  <input name="followUps" type="number" min={0} defaultValue={6} />
                </label>
              </div>
              <div className="dm-form-foot">
                <button type="submit" className="dm-button">
                  Save report
                </button>
                {saved ? (
                  <span className="dm-saved" role="status">
                    Saved. {saved}
                  </span>
                ) : null}
              </div>
            </form>

            <div className="dm-recent">
              <p className="dm-chart-head">
                <span>Recent reports, {periodLabel}</span>
                <span className="dm-muted">{inScope.length} in scope</span>
              </p>
              <ul className="dm-recent-list">
                {recent.map((report) => (
                  <li key={report.id}>
                    <span className="dm-recent-when">{MONTHS[report.month]}</span>
                    <span className="dm-recent-what">
                      {report.region} · {report.ministry}
                    </span>
                    <span className="dm-recent-nums">
                      {fmt(report.reached)} reached · {fmt(report.decisions)} decisions
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
