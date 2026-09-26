import type { Metadata } from "next";
import Image from "next/image";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

import { pageHref } from "../addresses";
import { InquiryForm } from "../inquiry";
import { StarField } from "../star-field";

const MARK = "TENTMAiKER";
const TITLE = `Work with us | ${MARK}`;
const DESCRIPTION =
  "We make tents together. Tell us what you're trying to accomplish and where you could use help.";

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
 * The next scene after the front page: closer to the tent, at its open door,
 * where the light is. Why we make tents, then an invitation to tell us what
 * you are working on, with the form right there beneath it.
 */
export default async function ContactPage() {
  const home = await pageHref("/");

  return (
    <main className="tm-contact">
      <div className="tm-contact-sky">
        <StarField />
      </div>

      <header className="tm-contact-head">
        <a className="tm-mark tm-home" href={home}>
          <span className="tm-sr">TentMAiKER, front page</span>
          <span aria-hidden="true">
            TENTM<span className="tm-ai">Ai</span>KER
          </span>
        </a>
      </header>

      <section className="tm-story" aria-labelledby="tm-story-title">
        <div className="tm-story-words">
          <h1 id="tm-story-title" className="tm-title">
            <span>We make tents</span> <span>
              together<span className="tm-dot">.</span>
            </span>
          </h1>

          <div className="tm-prose">
            <p>
              Paul worked alongside Aquila and Priscilla because they shared a trade. They made tents
              together. That simple picture still speaks to us.
            </p>
            <p>
              <strong>We&rsquo;re a team on mission.</strong>{" "}
              We come alongside people and organizations to
              build what their assignment calls for. The work provides for our families and helps fund the
              ministry we&rsquo;re called to continue.
            </p>
          </div>

          <p className="tm-ref">Acts 18:2&ndash;3</p>
        </div>

        <figure className="tm-door" aria-hidden="true">
          <Image src="/tentmaiker/doorway-900.webp" width={900} height={1060} alt="" unoptimized />
        </figure>
      </section>

      <section className="tm-invite" aria-labelledby="tm-invite-title">
        <div className="tm-invite-words">
          <h2 id="tm-invite-title">
            What are you working on<span className="tm-dot">?</span>
          </h2>
          <p className="tm-invite-lede">
            Tell us what you&rsquo;re trying to accomplish and where you could use help. We&rsquo;d be glad
            to start a conversation.
          </p>
        </div>

        <div className="tm-panel">
          <InquiryForm home={home} />
        </div>
      </section>
    </main>
  );
}
