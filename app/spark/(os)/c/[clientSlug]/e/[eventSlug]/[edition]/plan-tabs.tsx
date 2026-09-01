import Link from "next/link";

/**
 * One Plan, two sides. Ideas is what the team is considering; Schedule is
 * what is actually happening. Two routes underneath, one surface to the
 * reader.
 */
export function PlanTabs({ base, active }: { base: string; active: "ideas" | "schedule" }) {
  return (
    <div className="ev-plan-tabs" role="tablist" aria-label="Plan">
      <Link
        href={`${base}/plan`}
        role="tab"
        aria-selected={active === "ideas"}
        className={active === "ideas" ? "ev-plan-tab-on" : ""}
      >
        Ideas
      </Link>
      <Link
        href={`${base}/schedule`}
        role="tab"
        aria-selected={active === "schedule"}
        className={active === "schedule" ? "ev-plan-tab-on" : ""}
      >
        Schedule
      </Link>
    </div>
  );
}
