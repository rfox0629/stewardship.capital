/**
 * Spark.
 *
 * The same node that ends Stewardship.Capital ends Spark, because Spark is a
 * product of that company and the shared device is how you can tell. The node
 * is Spark's and is never themed by a client or an event.
 */
export function SparkMark({ className }: { className?: string }) {
  return (
    <span className={className ? `sp-mark ${className}` : "sp-mark"}>
      Spark
      <span className="sp-mark-dot">.</span>
    </span>
  );
}
