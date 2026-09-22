import type { Metadata } from "next";

import GuestGuidePage from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/page";

import { GUEST_DESCRIPTION, GUEST_TITLE, previewMetadata } from "./preview";
import { SHINE_2026 } from "./route-params";

/** The guest guide, at the short address. The page itself is the existing one. */

export const metadata: Metadata = previewMetadata(GUEST_TITLE, GUEST_DESCRIPTION, "/shine/2026");

export default async function ShineGuestGuide() {
  return GuestGuidePage({ params: Promise.resolve(SHINE_2026) });
}
