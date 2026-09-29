import type { Metadata } from "next";

import GuestGuidePage from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/page";

import { GUEST_DESCRIPTION, GUEST_TITLE, previewMetadata } from "../2026/preview";
import { SHINE_2026 } from "../2026/route-params";

/**
 * /shine, for the link somebody types from memory.
 *
 * It was a 404, which is why pasting it into a message produced a broken
 * chip rather than the weekend. It is the same guide the year has, the same
 * page and the same access rules, with the canonical pointing at the address
 * with the year on it: a third door into one room, not a third room.
 *
 * Serving it rather than redirecting is deliberate. A redirect only unfurls
 * for a client that follows one to read its metadata, and the whole point of
 * this address is the card it makes in a text message.
 */

export const metadata: Metadata = previewMetadata(GUEST_TITLE, GUEST_DESCRIPTION, "/shine/2026");

export default async function ShineShortGuestGuide() {
  return GuestGuidePage({ params: Promise.resolve(SHINE_2026) });
}
