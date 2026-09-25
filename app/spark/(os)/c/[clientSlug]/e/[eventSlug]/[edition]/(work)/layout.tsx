import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import "@app/styles/site.css";
import "@spark/event.css";
import "@spark/workspace.css";

import { SiteNav } from "@app/(www)/_components/site-nav";
import { eventBody, eventDisplay, eventSub } from "@app/fonts";
import { dateRangeLabel, resolveEngagement } from "@lib/spark/engagement";
import { publicPath } from "@lib/spark/href";
import { preferShortPath } from "@lib/spark/paths";
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
 * Spark goes quiet here on purpose. It keeps one mark, the
 * Stewardship.Capital wordmark top left. The footer carries the client's
 * own event and nothing of the product's.
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
  /* What the links say. The routes below are unchanged; only the address a
     person is handed depends on the domain they came to. */
  const href = await publicPath(base);
  const signOut = await publicPath("/spark/signout");
  /* The guide has a printed address of its own where one exists, and the
     short form is already public, so it is only cleaned when it is not. */
  const guideHref = await publicPath(preferShortPath(base));
  const teamHref = await publicPath(preferShortPath(`${base}/team`));
  const working = role === "planner" || role === "client";

  /* The team guide is the weekend as the team reads it: the guest guide plus
     the run of show and duties. The calendar is the one place it is edited.
     Budget is what it costs. The idea bank and the planning resources are no
     longer doors; their data is untouched and their routes still resolve.

     A guest has no door here at all: their weekend is the guide. */
  const nav: EventNavItem[] = working
    ? [
        { href: teamHref, label: "Team guide" },
        { href: `${href}/schedule`, label: "Calendar", also: [`${href}/plan`] },
        { href: `${href}/budget`, label: "Budget" },
      ]
    : [{ href: guideHref, label: "Weekend guide" }];

  const dates = dateRangeLabel(engagement.startsOn, engagement.endsOn);

  /* The hero path is validated by the theme parser to a narrow repo local
     shape, so it can safely become a background declaration. The overlay
     keeps type legible and holds the photograph inside the palette.
     Only the image is set here: how it is cropped belongs to the stylesheet,
     which varies it by width rather than asking one crop to work from a
     phone to an ultrawide. */
  const mastheadStyle: CSSProperties | undefined = theme.images.hero
    ? {
        backgroundImage: `linear-gradient(rgba(32, 37, 26, 0.84), rgba(32, 37, 26, 0.68)), url(${theme.images.hero})`,
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
            <form action={signOut} method="post">
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
