import type { Metadata, Viewport } from "next";

import "../../spark/spark.css";

import GuideLayout, {
  generateMetadata as guideMetadata,
  viewport as guideViewport,
} from "@app/spark/(os)/c/[clientSlug]/e/[eventSlug]/[edition]/(guide)/layout";

import { SHINE_2026 } from "./route-params";

/**
 * SHINE Founders Weekend, at the address that goes on a card.
 *
 * The same shell the workspace path renders, with the parameters fixed. It is
 * a second address for one guide, not a second guide: the layout, the pages,
 * the loader and the access rules are all the existing ones, so there is
 * nothing here that can drift away from them.
 */

export const viewport: Viewport = guideViewport;

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await guideMetadata({ params: Promise.resolve(SHINE_2026) });
  return {
    ...metadata,
    alternates: { canonical: "/shine/2026" },
    /* A guide for invited guests, as it was under the old address. */
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ShineGuideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="eo-frame">
      {await GuideLayout({ children, params: Promise.resolve(SHINE_2026) })}
    </div>
  );
}
