import Link from "next/link";

/**
 * One plan, two views of the same ideas. Ideas asks what we are considering
 * and what needs an answer; Weekend asks where any of it sits in time. They
 * stopped duplicating each other when the first one stopped being a second
 * calendar.
 */
export function PlanTabs({ base, active }: { base: string; active: "ideas" | "weekend" }) {
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
        aria-selected={active === "weekend"}
        className={active === "weekend" ? "ev-plan-tab-on" : ""}
      >
        Weekend
      </Link>
    </div>
  );
}
