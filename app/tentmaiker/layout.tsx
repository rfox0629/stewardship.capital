import { sora } from "./fonts";
import "./tentmaiker.css";

/**
 * Tent MAiKER's own page, served at tentmaiker.com/.
 *
 * Nobody links to this path. The proxy rewrites the product domain's root
 * here by host (lib/spark/hosts.ts), so Stewardship.Capital's `/` never has
 * to know which domain it is on. It sits outside the (www) group on purpose:
 * it shares no stylesheet with Stewardship.Capital or Spark and cannot change
 * either of them.
 */
export default function TentMaikerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={`tm ${sora.variable}`}>{children}</div>;
}
