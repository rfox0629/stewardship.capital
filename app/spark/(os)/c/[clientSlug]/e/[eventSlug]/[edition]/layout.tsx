import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import "@app/styles/site.css";
import "@spark/event.css";

import { SiteNav } from "@app/(www)/_components/site-nav";
import { eventBody, eventDisplay, eventSub } from "@app/fonts";
import { dateRangeLabel, resolveEngagement } from "@lib/spark/engagement";
import { themeVariables } from "@lib/spark/theme";
import { EventNav, type EventNavItem } from "./event-nav";

/**
 * The engagement shell.
 *
 * Everything inside this layout wears the client's identity. The theme is
 * validated configuration from the engagement row, never raw CSS, and the
 * person's role decides which navigation exists at all: a surface a reader
 * cannot open is not rendered as a link they cannot use.
 *
 * Spark goes quiet here on purpose. It keeps exactly two marks: the
 * Stewardship.Capital wordmark top left, and the Powered by Spark line in the
 * footer, whose orange node is Spark's own and is not themable.
 */

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export async function generateMetadata({
  params,
}: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) return {};
  return {
    title: {
      absolute: `${context.engagement.name} | ${context.engagement.organizationName}`,
      template: `%s | ${context.engagement.name}`,
    },
  };
}

export default async function EngagementLayout({ children, params }: LayoutProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const { engagement, theme, role } = context;
  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  const working = role === "planner" || role === "client";

  const nav: EventNavItem[] = working
    ? [
        { href: base, label: "The weekend" },
        { href: `${base}/sparks`, label: "Sparks" },
        { href: `${base}/schedule`, label: "Schedule" },
        { href: `${base}/budget`, label: "Budget" },
        { href: `${base}/tasks`, label: "Tasks" },
        { href: `${base}/resources`, label: "Resources" },
        { href: `${base}/decisions`, label: "Decisions" },
        /* The run of show is the one planner-only surface; a link a reader
           cannot open is not rendered for them. */
        ...(role === "planner" || context.staff
          ? [{ href: `${base}/run-of-show`, label: "Run of show" }]
          : []),
      ]
    : [{ href: `${base}/schedule`, label: "Schedule" }];

  const dates = dateRangeLabel(engagement.startsOn, engagement.endsOn);

  /* The hero path is validated by the theme parser to a narrow repo local
     shape, so it can safely become a background declaration. The overlay
     keeps type legible and holds the photograph inside the palette. */
  const mastheadStyle: CSSProperties | undefined = theme.images.hero
    ? {
        backgroundImage: `linear-gradient(rgba(32, 37, 26, 0.86), rgba(32, 37, 26, 0.72)), url(${theme.images.hero})`,
        backgroundSize: "cover",
        backgroundPosition: "center 65%",
      }
    : undefined;

  return (
    <div
      className={`ev ${eventDisplay.variable} ${eventBody.variable} ${eventSub.variable}`}
      style={themeVariables(theme) as CSSProperties}
    >
      <header className="ev-masthead" style={mastheadStyle}>
        <SiteNav />
        <div className="ev-shell ev-masthead-inner">
          {theme.images.organizationLogo ? (
            <Image
              className="ev-org-logo"
              src={theme.images.organizationLogo}
              alt={engagement.organizationName}
              width={160}
              height={83}
              priority
            />
          ) : (
            <p className="ev-eyebrow">{engagement.organizationName}</p>
          )}

          <div className="ev-title-block">
            <h1 className="ev-title">{engagement.name}</h1>
            {theme.copy.tagline ? (
              <p className="ev-campaign">{theme.copy.tagline}</p>
            ) : null}
          </div>

          <p className="ev-meta">
            {dates ? <span>{dates}</span> : null}
            {engagement.location ? <span>{engagement.location}</span> : null}
            {engagement.venue ? <span>{engagement.venue}</span> : null}
          </p>
        </div>
      </header>

      <EventNav items={nav} />

      <main className="ev-main">
        <div className="ev-shell">{children}</div>
      </main>

      <footer className="ev-footer">
        <div className="ev-shell ev-footer-inner">
          <span>
            {engagement.organizationName} {engagement.name}
            {engagement.location ? `, ${engagement.location}` : ""}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 20 }}>
            {theme.poweredBySpark ? (
              <span className="ev-powered">
                <span className="ev-node" aria-hidden="true" />
                Powered by Spark · Stewardship.Capital
              </span>
            ) : null}
            <form action="/spark/signout" method="post">
              <button className="ev-signout" type="submit">
                Sign out
              </button>
            </form>
          </span>
        </div>
      </footer>
    </div>
  );
}
