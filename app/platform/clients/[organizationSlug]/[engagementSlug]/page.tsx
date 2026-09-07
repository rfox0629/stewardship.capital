import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import "@app/styles/site.css";
import "../../../platform.css";

import { SiteNav } from "@app/(www)/_components/site-nav";
import { engagementHref, SPARK_PRODUCT } from "@lib/platform/engagement-href";
import { resolveAccess } from "@lib/spark/access";
import { PLATFORM_HOME, SPARK_ENTRY } from "@lib/spark/paths";
import { createClient } from "@lib/supabase/server";
import { NoteForm } from "./note-form";

export const dynamic = "force-dynamic";

/**
 * A Stewardship.Capital engagement that runs on no product.
 *
 * Consulting, advisory, and build work has no schedule, budget, or guest
 * list, so it does not belong in Spark's screens. This is the smallest place
 * for staff to work on it: what the engagement is, and what has been thought
 * about it so far, in order. Staff only. A client is never sent here.
 */

type PageProps = {
  params: Promise<{ organizationSlug: string; engagementSlug: string }>;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_email: string | null;
};

const longDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export async function generateMetadata({ params }: PageProps) {
  const { engagementSlug } = await params;
  return { title: engagementSlug };
}

export default async function EngagementPage({ params }: PageProps) {
  const { organizationSlug, engagementSlug } = await params;

  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;
  if (!supabase || !access) redirect(PLATFORM_HOME);
  if (!access.staff) redirect(SPARK_ENTRY);

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", organizationSlug)
    .maybeSingle();
  if (!organization) notFound();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("id, slug, name, status, summary, series_slug, edition_label, product_key")
    .eq("organization_id", organization.id)
    .eq("slug", engagementSlug)
    .maybeSingle();
  if (!engagement) notFound();

  /* A product engagement has its own home. Send it there rather than show a
     second, thinner view of the same thing. */
  if (engagement.product_key === SPARK_PRODUCT) {
    redirect(
      engagementHref({
        organizationSlug: organization.slug,
        engagementSlug: engagement.slug,
        seriesSlug: engagement.series_slug,
        editionLabel: engagement.edition_label,
        productKey: engagement.product_key,
      }),
    );
  }

  const { data: notes } = await supabase.rpc("engagement_notes_for", {
    target: engagement.id,
  });
  const noteRows = (notes ?? []) as NoteRow[];

  return (
    <div className="pf">
      <SiteNav />
      <div className="pf-shell">
        <header className="pf-head">
          <div>
            <Link className="pf-back" href={PLATFORM_HOME}>
              Platform
            </Link>
            <p className="pf-eyebrow">{organization.name}</p>
            <h1 className="pf-title">{engagement.name}</h1>
          </div>
        </header>

        <section className="pf-section" aria-label="Overview">
          <div className="pf-section-head">
            <h2 className="pf-section-title">Overview</h2>
          </div>
          <dl className="pf-facts">
            <div>
              <dt>Organization</dt>
              <dd>{organization.name}</dd>
            </div>
            <div>
              <dt>Engagement</dt>
              <dd>{engagement.name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{engagement.status}</dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>{engagement.summary ?? <span className="pf-quiet">Nothing written yet.</span>}</dd>
            </div>
          </dl>
        </section>

        <section className="pf-section" aria-label="Meetings and notes">
          <div className="pf-section-head">
            <h2 className="pf-section-title">Meetings and notes</h2>
            <span className="pf-note">
              {noteRows.length === 0
                ? "Staff only"
                : `${noteRows.length} · staff only`}
            </span>
          </div>

          <NoteForm
            engagementId={engagement.id}
            organizationSlug={organization.slug}
            engagementSlug={engagement.slug}
          />

          {noteRows.length === 0 ? (
            <p className="pf-quiet">No notes yet. The first meeting changes that.</p>
          ) : (
            <ol className="pf-notes">
              {noteRows.map((note) => (
                <li key={note.id} className="pf-note-item">
                  <div className="pf-note-head">
                    <span className="pf-note-title">{note.title}</span>
                    <span className="pf-note-meta">
                      {longDate(note.created_at)}
                      {note.author_email ? ` · ${note.author_email}` : ""}
                    </span>
                  </div>
                  <p className="pf-note-body">{note.body}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
