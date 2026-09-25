/**
 * Tentmaiker, wearing the same node that ends Stewardship.Capital.
 *
 * The product owns its own mark, so app/spark stays self contained and can
 * move to its own repository without reaching back for chrome. The folder is
 * still called spark and the node is still the product's; only the word a
 * person reads has changed.
 */
export function SparkWordmark({ className }: { className?: string }) {
  return (
    <span className={className ? `mark ${className}` : "mark"}>
      Tentmaiker
      <span className="mark-dot">.</span>
    </span>
  );
}
