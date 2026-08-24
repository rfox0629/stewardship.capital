import type { Metadata } from "next";
import { cookies } from "next/headers";

import { sessionSecret } from "../../../lib/spark/config";
import { maskEmail } from "../../../lib/spark/mask";
import { CHALLENGE_COOKIE } from "../../../lib/spark/session";
import { readChallenge } from "../../../lib/spark/verification";
import { MultiplierField } from "../_components/multiplier-field";
import { SiteNav } from "../_components/site-nav";
import { SparkEntry } from "../_components/spark-entry";
import { SparkWordmark } from "../_components/spark-wordmark";

export const metadata: Metadata = {
  title: "Spark",
  description: "Sign in to Spark.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Opening a private product, not reading about one.
 *
 * The step is decided on the server from the signed challenge, so arriving
 * from an invitation link lands straight on the code, and the address it was
 * sent to is never taken from the browser.
 */
export default async function MorePage() {
  let stage: { name: "email" } | { name: "code"; hint: string } = { name: "email" };

  try {
    const store = await cookies();
    const challenge = await readChallenge(
      store.get(CHALLENGE_COOKIE)?.value,
      sessionSecret(),
    );
    if (challenge) stage = { name: "code", hint: maskEmail(challenge.email) };
  } catch {
    /* A misconfigured deploy shows the front door rather than an error. */
  }

  return (
    <>
      <SiteNav />

      <section className="entry" aria-labelledby="entry-heading">
        <MultiplierField />

        <div className="entry-inner">
          <div className="mask">
            <h1 id="entry-heading" className="entry-mark">
              <SparkWordmark />
            </h1>
          </div>

          <div className="mask">
            <p className="entry-sub">
              Capture freely. Discern carefully. Move intentionally.
            </p>
          </div>

          <SparkEntry initialStage={stage} />
        </div>
      </section>
    </>
  );
}
