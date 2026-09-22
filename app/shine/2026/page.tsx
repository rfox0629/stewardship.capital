import type { Metadata } from "next";

import { loadGuide } from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/load";
import GuestGuidePage from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/page";

import { SHINE_2026 } from "./route-params";

/** The guest guide, at the short address. The page itself is the existing one. */

/* The title is written out in full, because a page one segment below the
   site root would otherwise inherit the company's title template and greet a
   guest with Stewardship.Capital rather than their own weekend. */
export async function generateMetadata(): Promise<Metadata> {
  const loaded = await loadGuide(SHINE_2026.clientSlug, SHINE_2026.eventSlug, SHINE_2026.edition);
  return {
    title: { absolute: loaded ? `${loaded.guide.name} | ${loaded.guide.organization}` : "Weekend guide" },
    alternates: { canonical: "/shine/2026" },
  };
}

export default async function ShineGuestGuide() {
  return GuestGuidePage({ params: Promise.resolve(SHINE_2026) });
}
