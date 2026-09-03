import Link from "next/link";

/**
 * One plan, two views of the same ideas. Ideas is the workbench, holding
 * everything under consideration; Weekend is the canvas, holding what is
 * actually happening. They are a single control rather than two links,
 * because moving between them is switching lens, not navigating away.
 */
export function PlanTabs({ base, active }: { base: string; active: "ideas" | "weekend" }) {
  return (
    <div className="ws-lens-seg" role="tablist" aria-label="Plan">
      <Link
        href={`${base}/plan`}
        role="tab"
        aria-selected={active === "ideas"}
        className={active === "ideas" ? "ws-seg-on" : ""}
      >
        Ideas
      </Link>
      <Link
        href={`${base}/schedule`}
        role="tab"
        aria-selected={active === "weekend"}
        className={active === "weekend" ? "ws-seg-on" : ""}
      >
        Weekend
      </Link>
    </div>
  );
}
