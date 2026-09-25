import type { Metadata } from "next";
import { getImageProps } from "next/image";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

import { StarField } from "./star-field";

const NAME = "TentMAiKER";
/* The name as the wordmark sets it, for places that show it as text. */
const MARK = "TENTMAiKER";
/* What a shared link and the browser tab say: the name, then the trade Paul
   shared with Aquila and Priscilla, and where it is written. */
const TITLE = `${MARK} | In the trade, working together. Acts 18:3`;
const LINE = "Making Tents. Funding Mission.";
const ALT =
  "An old canvas tent at night, its entrance flaps tied open to the front poles and its guy ropes staked to the ground. Inside, a person sits on a stool at a low table, typing on a laptop whose light falls on them and on the canvas.";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCT_ORIGIN),
  title: { absolute: TITLE },
  description: `${LINE} TentMAiKER brings people together to build useful technology, and the work helps provide for ministry.`,
  alternates: { canonical: "/" },
  icons: { icon: "/tentmaiker/icon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: MARK,
    title: TITLE,
    description: LINE,
    images: [{ url: "/tentmaiker/og.png", width: 1200, height: 630, alt: ALT }],
  },
  twitter: { card: "summary_large_image" },
};

/**
 * The tent is art directed: the whole tent, wide, beside the words on a
 * large screen; a slightly closer frame on a phone, where the picture leads.
 */
function Tent() {
  const { props } = getImageProps({
    alt: ALT,
    src: "/tentmaiker/tent-wide-2260.webp",
    width: 2260,
    height: 1470,
    unoptimized: true,
    priority: true,
  });
  return (
    <picture>
      <source
        media="(max-width: 760px)"
        srcSet="/tentmaiker/tent-narrow-910.webp 910w, /tentmaiker/tent-narrow-1820.webp 1820w"
        sizes="100vw"
        width={1820}
        height={1350}
      />
      <source
        srcSet="/tentmaiker/tent-wide-1130.webp 1130w, /tentmaiker/tent-wide-2260.webp 2260w"
        sizes="64vw"
      />
      <img {...props} alt={ALT} />
    </picture>
  );
}

/**
 * One screen: the name, the tent, the two lines, and where the idea comes
 * from. Paul worked with Aquila and Priscilla because they shared a trade
 * (Acts 18:2-3); the picture says the rest.
 */
export default function TentMaikerPage() {
  return (
    <main className="tm-page">
      <StarField />

      <p className="tm-mark">
        <span className="tm-sr">{NAME}</span>
        <span aria-hidden="true">
          TENTM<span className="tm-ai">Ai</span>KER
        </span>
      </p>

      <div className="tm-hero">
        <div className="tm-words">
          <h1 className="tm-line">
            <span>
              Making Tents<span className="tm-dot">.</span>
            </span>{" "}
            <span>
              Funding Mission<span className="tm-dot">.</span>
            </span>
          </h1>
          <p className="tm-ref">Acts 18:2&ndash;3</p>
        </div>

        <figure className="tm-art">
          <Tent />
        </figure>
      </div>
    </main>
  );
}
