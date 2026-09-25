/**
 * Tentmaiker.
 *
 * The same node that ends Stewardship.Capital ends Tentmaiker, because the
 * product belongs to that company and the shared device is how you can tell.
 * The node is the product's and is never themed by a client or an event.
 */
export function SparkMark({ className }: { className?: string }) {
  return (
    <span className={className ? `sp-mark ${className}` : "sp-mark"}>
      Tentmaiker
      <span className="sp-mark-dot">.</span>
    </span>
  );
}
