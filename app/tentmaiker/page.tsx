import type { Metadata } from "next";
import Image from "next/image";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

const NAME = "Tent MAiKER";
const SENTENCE =
  "We build useful technology together, and the work helps provide for ministry.";

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
    images: [
      {
        url: "/tentmaiker/og.png",
        width: 1200,
        height: 630,
        alt: "An old canvas tent drawn in fine lines, open at the front, with a robed figure inside working at a laptop.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

/**
 * One screen: the name, the tent, a few words, one sentence, and where the
 * idea comes from. Paul worked with Aquila and Priscilla because they shared
 * a trade (Acts 18:2-3); the page lets the picture say the rest.
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
          <Image
            src="/tentmaiker/tent.svg"
            alt="An old canvas tent drawn in fine lines, its flaps tied open. Inside, lit only by the screen, a robed and bearded figure sits on a wooden bench working at a laptop. Behind the tent, a ring holds a night sky on one side and circuitry on the other."
            width={980}
            height={790}
            priority
            unoptimized
          />
        </figure>
      </div>
    </main>
  );
}
