import type { Metadata } from "next";

import { PRODUCT_ORIGIN } from "@lib/spark/hosts";

/**
 * What a shared link says about this weekend.
 *
 * A link to the guide is pasted into a text message far more often than it is
 * typed, so the preview is the first thing most guests will see of it. These
 * routes sit under the company's own metadata, which would otherwise announce
 * Spark, the tool the weekend was planned with, to people who have never heard
 * of it and do not need to. So both routes say what they are in the client's
 * own words, over the photograph of the property.
 *
 * The team route says only that much too. A messaging app fetches a link with
 * no session, and it is told the name of the weekend and nothing whatever
 * about who is running what.
 */

/**
 * Link previews need whole URLs; a path means nothing inside a text message.
 *
 * The product's own domain, because that is where the guide lives now. The
 * company's domain still serves it, and will keep doing so until the links
 * already in people's messages have been given time to move.
 */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCT_ORIGIN).replace(/\/$/, "");

/**
 * The card a shared link shows: the property at dusk with the SHINE mark
 * across the middle, baked into the file rather than drawn over it, because
 * a messaging app renders an image and nothing else.
 *
 * Sized 1200 by 630, the shape the cards expect, with the mark inside the
 * centre square so it survives the square crop some apps use. The version in
 * the filename is deliberate: apps cache a preview by its URL, so a new
 * picture needs a new name to be fetched at all.
 */
export const SOCIAL_IMAGE = {
  url: `${SITE_ORIGIN}/clients/shine/social/founders-weekend-2026-v3.jpg`,
  width: 1200,
  height: 630,
  alt: "SHINE, over the lake house at dusk at Spooner Lake Island Oasis",
  type: "image/jpeg",
};

export const GUEST_TITLE = "SHINE Founders Weekend 2026";
export const TEAM_TITLE = "SHINE Founders Weekend 2026 | Team";

export const GUEST_DESCRIPTION =
  "Your weekend guide to the schedule, activities, meals, and coffee.";
export const TEAM_DESCRIPTION =
  "Your guide to the run of show, volunteer duties, and personal schedule.";

/** One shape for the title, the description, and every preview card. */
export const previewMetadata = (
  title: string,
  description: string,
  path: string,
): Metadata => ({
  metadataBase: new URL(SITE_ORIGIN),
  title: { absolute: title },
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    title,
    description,
    siteName: GUEST_TITLE,
    url: `${SITE_ORIGIN}${path}`,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SOCIAL_IMAGE.url],
  },
  /* An unlisted guide, as it was before it had a short address. Unfurling a
     link someone was given is not the same as being found in search. */
  robots: { index: false, follow: false, nocache: true },
});
