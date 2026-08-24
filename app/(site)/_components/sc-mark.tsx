import Link from "next/link";

type ScMarkProps = {
  href?: string;
  inverted?: boolean;
  label?: string;
};

/**
 * Three strands converging into one path. The homepage diagram compressed
 * into a monogram so the brand mark and the page tell the same story.
 */
export function ScMark({ href, inverted, label = "Stewardship Capital" }: ScMarkProps) {
  const mark = (
    <>
      <svg
        className="sc-mark-glyph"
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" strokeWidth="2.1" strokeLinecap="round">
          <path d="M3 9 C 14 9, 18 15, 24 20" stroke="var(--sc-time)" />
          <path d="M3 20 H 24" stroke="var(--sc-talent)" />
          <path d="M3 31 C 14 31, 18 25, 24 20" stroke="var(--sc-treasure)" />
          <path
            d="M24 20 H 33"
            stroke={inverted ? "var(--sc-paper)" : "var(--sc-navy)"}
          />
        </g>
        <circle cx="24" cy="20" r="3.1" fill="var(--sc-treasure)" />
      </svg>
      <span className="sc-mark-word">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link className="sc-mark" href={href} data-inverted={inverted ? "true" : undefined}>
        {mark}
      </Link>
    );
  }

  return (
    <span className="sc-mark" data-inverted={inverted ? "true" : undefined}>
      {mark}
    </span>
  );
}
