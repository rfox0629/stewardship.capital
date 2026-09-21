import { notFound } from "next/navigation";

import { GuideApp } from "./guide-app";
import { loadGuide } from "./load";

/**
 * The weekend, for guests.
 *
 * Public: no account, no sign in. What it shows comes only from
 * weekend_guide(), which returns the published, public, Thursday to Sunday
 * reading of the calendar and nothing else, so no internal detail can be in
 * this page's payload even by mistake.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

export const metadata = { title: "Weekend guide" };

export default async function GuestGuidePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const loaded = await loadGuide(clientSlug, eventSlug, edition);
  if (!loaded) notFound();
  const { guide } = loaded;

  return (
    <GuideApp
      storeKey={`gd:${clientSlug}:${eventSlug}:${edition}:guest`}
      startsOn={guide.startsOn}
      moments={guide.moments}
      activities={guide.activities}
      coffee={guide.coffee}
    />
  );
}
