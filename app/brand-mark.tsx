import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  href?: string;
  inverted?: boolean;
};

export function BrandMark({ className = "brand", href, inverted }: BrandMarkProps) {
  const mark = (
    <>
      <span
        className="brand-monogram"
        data-inverted={inverted ? "true" : undefined}
        aria-hidden="true"
      >
        SC
      </span>
      <span className="brand-wordmark">Stewardship Capital</span>
    </>
  );

  if (href) {
    return (
      <Link className={className} href={href} aria-label="Stewardship Capital home">
        {mark}
      </Link>
    );
  }

  return <span className={className}>{mark}</span>;
}
