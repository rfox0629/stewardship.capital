"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { editionPath } from "../_lib/paths";
import { sectionsFor } from "../_lib/viewer";
import type { ViewerRole } from "../_lib/viewer";

type EditionNavProps = {
  clientSlug: string;
  eventSlug: string;
  editionSlug: string;
  viewer: ViewerRole;
};

export function EditionNav({
  clientSlug,
  eventSlug,
  editionSlug,
  viewer,
}: EditionNavProps) {
  const pathname = usePathname();
  const home = editionPath(clientSlug, eventSlug, editionSlug);
  const sections = sectionsFor(viewer);

  return (
    <nav className="eo-nav" aria-label="Event sections">
      <div className="eo-nav-inner">
        {sections.map((section) => {
          const href = section.key ? `${home}/${section.key}` : home;
          const isActive = section.key
            ? pathname.startsWith(href)
            : pathname === home;

          return (
            <Link
              key={section.key || "home"}
              href={href}
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
