/**
 * The node, doing real work.
 *
 * In Stewardship.Capital the node is latent capital that attention activates.
 * In Spark it gains a lifecycle: one point commits, connects, and becomes a
 * run. Idea, Decision, Plan, Experience.
 *
 * This is the status primitive for the whole product rather than decoration,
 * which is how the brand language carries without explanatory graphics on
 * every screen. Two rules:
 *
 *   form  carries state      hollow is open, filled is settled
 *   accent carries activation only something live or needing attention is orange
 */
export type NodeStateKind =
  | "latent" /* captured, nothing owed yet */
  | "open" /* needs a decision or is blocked */
  | "settled" /* approved, confirmed, done */
  | "built" /* settled, and it created downstream work */
  | "closed"; /* declined or parked */

const LABEL: Record<NodeStateKind, string> = {
  latent: "Captured",
  open: "Needs attention",
  settled: "Settled",
  built: "Built into the plan",
  closed: "Closed",
};

export function NodeState({
  kind,
  label,
}: {
  kind: NodeStateKind;
  label?: string;
}) {
  return (
    <span className="sp-node" data-kind={kind} role="img" aria-label={label ?? LABEL[kind]}>
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {kind === "built" ? (
          <line className="sp-node-run" x1="10" y1="10" x2="20" y2="10" />
        ) : null}
        {kind === "closed" ? (
          <line className="sp-node-slash" x1="5.5" y1="14.5" x2="14.5" y2="5.5" />
        ) : null}
        <circle className="sp-node-ring" cx="10" cy="10" r="5.4" />
        {kind === "settled" || kind === "built" ? (
          <circle className="sp-node-core" cx="10" cy="10" r="2.9" />
        ) : null}
      </svg>
    </span>
  );
}
