import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import "@app/styles/site.css";
import "./platform.css";

import { MultiplierField } from "@app/(www)/_components/multiplier-field";
import { SiteNav } from "@app/(www)/_components/site-nav";
import { Wordmark } from "@app/(www)/_components/wordmark";
import { SparkEntry } from "@spark/_components/spark-entry";
import { platformClientPath } from "@lib/platform/engagement-href";
import { resolveAccess } from "@lib/spark/access";
import { OTP_EMAIL_COOKIE } from "@lib/spark/cookies";
import { maskEmail } from "@lib/spark/mask";
import { SPARK_ENTRY } from "@lib/spark/paths";
import { createClient } from "@lib/supabase/server";
import { PlatformBar } from "./_components/platform-bar";
import { EngagementForm, OrganizationForm, StaffForm } from "./platform-controls";

export const metadata = { title: { absolute: "Platform | Stewardship.Capital" } };
export const dynamic = "force-dynamic";

/**
 * The Stewardship.Capital platform home: the directory of clients.
 *
 * One row per client, each opening that client's own page, where their
 * projects and who can reach them live. Making a client, making an
 * engagement, and extending the staff grant are the rare things, so they sit
 * folded under Platform settings rather than between the rows.
 *
 * Explicit platform staff only. Signed out, this page is the door itself: the
 * same email and code sign in Spark uses, on the same identity, so there is
 * one set of credentials and one place they are decided. Signed in without
 * the grant, the route guard has already sent the person to Spark's front
 * door, and this page checks again before it renders a single row. Every row
 * below then comes through RLS, which makes the same check a third time.
 */

/**
 * The door, for anyone not signed in. The same two steps as Spark's front
 * door, wearing the Stewardship.Capital mark. Verification lands platform
 * staff back here and everyone else wherever they do belong.
 */
async function PlatformDoor() {
  const pending = (await cookies()).get(OTP_EMAIL_COOKIE)?.value;
  const stage = pending
    ? ({ name: "code", hint: maskEmail(pending) } as const)
    : ({ name: "email" } as const);

  return (
    <div className="www">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <section className="entry" aria-labelledby="platform-door-heading">
          <MultiplierField />
          <div className="entry-inner">
            <div className="mask">
              <h1 id="platform-door-heading" className="entry-mark entry-mark-sc">
                <Wordmark />
              </h1>
            </div>
            <div className="mask">
              <p className="entry-sub">Platform. Sign in to continue.</p>
            </div>
            <SparkEntry initialStage={stage} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default async function PlatformPage() {
  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;

  if (!supabase || !access) return <PlatformDoor />;
  if (!access.staff) redirect(SPARK_ENTRY);

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .order("name");
  const clients = organizations ?? [];

  return (
    <div className="pf">
      <PlatformBar />
      <main className="pf-shell">
        <h1 className="pf-title">Clients</h1>

        {clients.length === 0 ? (
          <p className="pf-quiet pf-empty">
            No clients yet. The first one is made under Platform settings.
          </p>
        ) : (
          <ul className="pf-directory" aria-label="Clients">
            {clients.map((client) => (
              <li key={client.id}>
                <Link className="pf-client" href={platformClientPath(client.slug)}>
                  <span className="pf-client-name">{client.name}</span>
                  <span className="pf-client-action">
                    View client <span aria-hidden="true">&rarr;</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="pf-settings">
          <summary>
            <span className="pf-settings-caret" aria-hidden="true" />
            Platform settings
          </summary>

          <div className="pf-settings-body">
            <section className="pf-section" aria-label="New client">
              <div className="pf-section-head">
                <h2 className="pf-section-title">New client</h2>
              </div>
              <OrganizationForm />
            </section>

            <section className="pf-section" aria-label="New engagement">
              <div className="pf-section-head">
                <h2 className="pf-section-title">New engagement</h2>
                <span className="pf-note">Under an existing client</span>
              </div>
              <EngagementForm
                organizations={clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                }))}
              />
            </section>

            <section className="pf-section" aria-label="Platform staff">
              <div className="pf-section-head">
                <h2 className="pf-section-title">Platform staff</h2>
                <span className="pf-note">
                  The only grant that crosses clients. Extend it rarely.
                </span>
              </div>
              <StaffForm />
            </section>
          </div>
        </details>
      </main>
    </div>
  );
}
