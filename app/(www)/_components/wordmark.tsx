type WordmarkProps = {
  className?: string;
};

/**
 * The identity.
 *
 * A period normally ends a sentence. Here it is the joint where stewardship
 * becomes capital, so the dot is the logo, the multiplier, and the atomic
 * unit of every visual in the system. It is the only thing that carries the
 * accent colour.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={className ? `mark ${className}` : "mark"}>
      Stewardship
      <span className="mark-dot">.</span>
      Capital
    </span>
  );
}
