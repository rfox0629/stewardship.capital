import type { Metadata } from "next";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

import { pageHref } from "../addresses";
import { ContactBody } from "../inquiry";
import { StarField } from "../star-field";

const MARK = "TENTMAiKER";
const TITLE = `What are you building? | ${MARK}`;
const DESCRIPTION = "Tell us where you could use a hand.";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCT_ORIGIN),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  icons: { icon: "/tentmaiker/icon.svg" },
  openGraph: {
    type: "website",
    url: "/contact",
    siteName: MARK,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/tentmaiker/og.png", width: 1200, height: 630, alt: "An open canvas tent at night, lit from inside by a laptop." }],
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Where "Let's build" leads: one question, one line, and four fields, under
 * the same night sky as the front page. The body is a client component so
 * that, once sent, the thank you can take the whole page.
 */
export default async function ContactPage() {
  const home = await pageHref("/");

  return (
    <main className="tm-contact">
      <StarField />

      <a className="tm-mark tm-home" href={home}>
        <span className="tm-sr">TentMAiKER, front page</span>
        <span aria-hidden="true">
          TENTM<span className="tm-ai">Ai</span>KER
        </span>
      </a>

      <ContactBody home={home} />
    </main>
  );
}
