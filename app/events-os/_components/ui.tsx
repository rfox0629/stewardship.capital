import type { ReactNode } from "react";

export type Tone = "neutral" | "good" | "warn" | "stop" | "accent";

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="eo-pill" data-tone={tone === "neutral" ? undefined : tone}>
      {children}
    </span>
  );
}

export function Panel({
  title,
  action,
  flush,
  children,
}: {
  title: string;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="eo-panel">
      <div className="eo-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className={flush ? "eo-panel-body eo-panel-body-flush" : "eo-panel-body"}>
        {children}
      </div>
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="eo-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function Meter({
  actual,
  committed,
  planned,
}: {
  actual: number;
  committed: number;
  planned: number;
}) {
  const pct = (value: number) =>
    planned === 0 ? 0 : Math.min(100, Math.round((value / planned) * 100));
  const actualPct = pct(actual);
  const committedPct = Math.max(0, pct(committed) - actualPct);

  return (
    <div className="eo-meter" role="img" aria-label={`${actualPct} percent spent, ${pct(committed)} percent committed`}>
      <span className="eo-meter-actual" style={{ width: `${actualPct}%` }} />
      <span className="eo-meter-committed" style={{ width: `${committedPct}%` }} />
    </div>
  );
}

export function Workflow({ here }: { here: string }) {
  const steps = ["Spark", "Discuss", "Approve", "Build", "Confirm", "Reflect"];
  return (
    <div className="eo-flowline" aria-label="Stewardship Events workflow">
      {steps.map((step, index) => (
        <span key={step} data-here={step === here ? "true" : undefined}>
          {step}
          {index < steps.length - 1 ? <i aria-hidden="true"> &rsaquo; </i> : null}
        </span>
      ))}
    </div>
  );
}

export function EventsMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M3 6 C 9 6, 11 10, 14 12" />
        <path d="M3 12 H 14" />
        <path d="M3 18 C 9 18, 11 14, 14 12" />
        <path d="M14 12 H 20" />
      </g>
      <circle cx="14" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}
