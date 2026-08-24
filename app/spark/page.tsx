import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import "../styles/site.css";

import { choicesFrom, resolveAccess } from "../../lib/spark/access";
import { landingFor } from "../../lib/spark/authorize";
import { OTP_EMAIL_COOKIE } from "../../lib/spark/cookies";
import { maskEmail } from "../../lib/spark/mask";
import { createClient } from "../../lib/supabase/server";
import { MultiplierField } from "../(www)/_components/multiplier-field";
import { SiteNav } from "../(www)/_components/site-nav";
import { SparkEntry } from "./_components/spark-entry";
import { SparkWordmark } from "./_components/spark-wordmark";

export const dynamic = "force-dynamic";

/**
 * The front door.
 *
 * Universal on purpose. Spark does not put a client's name on the way in, so
 * this screen looks the same to everyone and cannot be read for who else is on
 * the platform. Client and event branding begins on the other side of it, once
 * Spark knows which engagement this identity is entering.
 *
 * It is also where a returning person lands. Membership is resolved here on
 * every visit, so someone still signed in goes straight through, and someone
 * whose access was withdrawn does not, no matter how valid their session is.
 */
export default async function SparkEntryPage() {
  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;
  const landing = landingFor(access);

  if (landing.kind === "platform" || landing.kind === "workspace") {
    redirect(landing.href);
  }

  let stage:
    | { name: "email" }
    | { name: "code"; hint: string }
    | { name: "refused" }
    | { name: "choose"; workspaces: ReturnType<typeof choicesFrom> };

  if (access) {
    stage =
      landing.kind === "choose"
        ? { name: "choose", workspaces: choicesFrom(access) }
        : { name: "refused" };
  } else {
    const pending = (await cookies()).get(OTP_EMAIL_COOKIE)?.value;
    stage = pending
      ? { name: "code", hint: maskEmail(pending) }
      : { name: "email" };
  }

  return (
    <div className="www">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <SiteNav />

      <main id="main">
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
      </main>
    </div>
  );
}
