/**
 * Spark, wearing the same node that ends Stewardship.Capital.
 *
 * Deliberately a local copy rather than an import from app/events-os, which
 * has to stay self contained so it can move to its own repository.
 */
export function SparkWordmark({ className }: { className?: string }) {
  return (
    <span className={className ? `mark ${className}` : "mark"}>
      Spark
      <span className="mark-dot">.</span>
    </span>
  );
}
