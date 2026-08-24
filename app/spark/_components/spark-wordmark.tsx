/**
 * Spark, wearing the same node that ends Stewardship.Capital.
 *
 * Spark owns its own mark, so app/spark stays self contained and
 * can move to its own repository without reaching back for chrome.
 */
export function SparkWordmark({ className }: { className?: string }) {
  return (
    <span className={className ? `mark ${className}` : "mark"}>
      Spark
      <span className="mark-dot">.</span>
    </span>
  );
}
