import type { Metadata } from "next";
import { getImageProps } from "next/image";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

const NAME = "Tent MAiKER";
const SENTENCE =
  "We build useful technology together, and the work helps provide for ministry.";
const ALT =
  "Inside an old canvas tent at night, its entrance curtains tied back, a person sits on a wooden stool at a low table, typing on a laptop. The screen is the only light in the tent.";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCT_ORIGIN),
  title: { absolute: NAME },
  description: `Still making tents. ${SENTENCE}`,
  alternates: { canonical: "/" },
  icons: { icon: "/tentmaiker/icon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: NAME,
    title: `${NAME}. Still making tents.`,
    description: SENTENCE,
    images: [{ url: "/tentmaiker/og.png", width: 1200, height: 630, alt: ALT }],
  },
  twitter: { card: "summary_large_image" },
};

/**
 * The tent is art directed: a near-square frame beside the words on a wide
 * screen, and a taller crop on a phone, where the picture leads.
 */
function Tent() {
  const common = { alt: ALT, unoptimized: true, priority: true };
  const { props: wide } = getImageProps({
    ...common,
    src: "/tentmaiker/tent-1640.webp",
    width: 1640,
    height: 1600,
  });
  return (
    <picture>
      <source
        media="(max-width: 760px)"
        srcSet={`/tentmaiker/tent-portrait-640.webp 640w, /tentmaiker/tent-portrait-1280.webp 1280w`}
        sizes="100vw"
        width={1280}
        height={1600}
      />
      <source
        srcSet="/tentmaiker/tent-820.webp 820w, /tentmaiker/tent-1640.webp 1640w"
        sizes="(max-width: 760px) 100vw, 56vw"
      />
      <img {...wide} alt={ALT} />
    </picture>
  );
}

/**
 * One screen: the name, the tent, a few words, one sentence, and where the
 * idea comes from. Paul worked with Aquila and Priscilla because they shared
 * a trade (Acts 18:2-3); the picture says the rest.
 */
export default function TentMaikerPage() {
  return (
    <main className="tm-page">
      <p className="tm-mark">
        <span className="tm-sr">{NAME}</span>
        <span aria-hidden="true">
          TENTM<span className="tm-ai">Ai</span>KER
        </span>
      </p>

      <div className="tm-hero">
        <div className="tm-words">
          <h1 className="tm-line">
            <span className="tm-nowrap">Still making</span> <span>tents.</span>
          </h1>
          <p className="tm-sentence">{SENTENCE}</p>
          <p className="tm-ref">Acts 18:2&ndash;3</p>
        </div>

        <figure className="tm-art">
          <Tent />
        </figure>
      </div>
    </main>
  );
}
