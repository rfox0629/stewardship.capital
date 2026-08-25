import Link from "next/link";

/**
 * One Plan, two lenses. Ideas is the Spark and Discern board; Weekend is the
 * event calendar, which carries its own Schedule and Run of Show lens. Two
 * routes underneath, one surface to the reader.
 */
export function PlanTabs({ base, active }: { base: string; active: "ideas" | "weekend" }) {
  return (
    <div className="ev-plan-tabs" role="tablist" aria-label="Plan">
      <Link
        href={`${base}/sparks`}
        role="tab"
        aria-selected={active === "ideas"}
        className={active === "ideas" ? "ev-plan-tab-on" : ""}
      >
        Ideas
      </Link>
      <Link
        href={`${base}/schedule`}
        role="tab"
        aria-selected={active === "weekend"}
        className={active === "weekend" ? "ev-plan-tab-on" : ""}
      >
        Weekend
      </Link>
    </div>
  );
}
