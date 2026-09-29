import type { Metadata, Viewport } from "next";

import "../../spark/spark.css";

import GuideLayout, {
  generateMetadata as guideMetadata,
  viewport as guideViewport,
} from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/layout";

import { SITE_ORIGIN, SOCIAL_IMAGE } from "../2026/preview";
import { SHINE_2026 } from "../2026/route-params";

/**
 * The shell for the shortest address of all.
 *
 * In a route group, so it wraps /shine and nothing underneath it. A layout
 * at app/shine would have wrapped /shine/2026 as well, which already has
 * this same shell, and the weekend would have been rendered inside itself.
 */

export const viewport: Viewport = guideViewport;

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await guideMetadata({ params: Promise.resolve(SHINE_2026) });
  return {
    ...metadata,
    metadataBase: new URL(SITE_ORIGIN),
    openGraph: { type: "website", images: [SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE.url] },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ShineShortLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="eo-frame">
      {await GuideLayout({ children, params: Promise.resolve(SHINE_2026) })}
    </div>
  );
}
