import type { Metadata } from "next";

import { MultiplierField } from "../_components/multiplier-field";
import { SiteNav } from "../_components/site-nav";
import { SparkEntry } from "../_components/spark-entry";
import { SparkWordmark } from "../_components/spark-wordmark";

export const metadata: Metadata = {
  title: "Spark",
  description: "Sign in to Spark.",
  robots: { index: false, follow: false },
};

/**
 * Opening a private product, not reading about one.
 */
export default function MorePage() {
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

          <SparkEntry />
        </div>
      </section>
    </>
  );
}
