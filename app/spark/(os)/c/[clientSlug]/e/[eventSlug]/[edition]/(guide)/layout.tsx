import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import "@spark/guide.css";

import { eventBody, eventDisplay, eventSub } from "@app/fonts";
import { dateRangeLabel } from "@lib/spark/engagement";
import { themeVariables } from "@lib/spark/theme";
import { loadGuide } from "./load";

/**
 * The weekend guide's shell.
 *
 * This is the client's own guest experience, so it wears the client's
 * identity fully: the lake house at dusk, the SHINE mark, the serif title,
 * the cream and forest palette. Spark stays out of the way apart from the
 * quiet line in the footer the theme allows.
 *
 * It renders for anyone when the guide is published, and for members before
 * it is. The data comes from weekend_guide(), which only ever returns the
 * public reading; the team page adds its own on top, through its own session.
 */

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f3528",
};

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { clientSlug, eventSlug, edition } = await params;
  const loaded = await loadGuide(clientSlug, eventSlug, edition);
  if (!loaded) return {};
  return {
    title: {
      absolute: `${loaded.guide.name} | ${loaded.guide.organization}`,
      template: `%s | ${loaded.guide.name}`,
    },
  };
}

export default async function GuideLayout({ children, params }: LayoutProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const loaded = await loadGuide(clientSlug, eventSlug, edition);
  if (!loaded) notFound();

  const { guide, theme } = loaded;
  const dates = dateRangeLabel(guide.startsOn, guide.endsOn);
  const hero = theme.images.hero;

  return (
    <div
      className={`gd ${eventDisplay.variable} ${eventBody.variable} ${eventSub.variable}`}
      style={themeVariables(theme) as CSSProperties}
    >
      <header className="gd-hero">
        {hero ? (
          <Image
            className="gd-hero-photo"
            src={hero}
            alt=""
            quality={70}
            fill
            priority
            sizes="100vw"
          />
        ) : null}
        <div className="gd-hero-veil" aria-hidden="true" />
        <div className="gd-shell gd-hero-inner">
          {theme.images.organizationLogo ? (
            <Image
              className="gd-logo"
              src={theme.images.organizationLogo}
              alt={guide.organization}
              width={120}
              height={62}
              priority
            />
          ) : (
            <p className="gd-eyebrow">{guide.organization}</p>
          )}
          <h1 className="gd-title">{guide.name}</h1>
          {theme.copy.tagline ? <p className="gd-tagline">{theme.copy.tagline}</p> : null}
          <p className="gd-meta">
            {dates ? <span>{dates}</span> : null}
            {guide.venue ? <span>{guide.venue}</span> : null}
          </p>
          {/* The weekend's own Scripture, where the theme has one. It is the
              reason for the tent, so it reads under the name rather than
              somewhere further down the page. */}
          {theme.copy.verse ? (
            <blockquote className="gd-verse">
              <p>{theme.copy.verse}</p>
              {theme.copy.verseRef ? <cite>{theme.copy.verseRef}</cite> : null}
            </blockquote>
          ) : null}
        </div>
      </header>

      {children}

      <footer className="gd-footer">
        <div className="gd-shell">
          <p>
            {guide.organization} {guide.name}
            {guide.location ? `, ${guide.location}` : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}
