"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { editionPath } from "../_lib/paths";

const sections = [
  { label: "Event home", segment: "" },
  { label: "Sparks", segment: "sparks" },
  { label: "This week", segment: "meeting" },
  { label: "Event plan", segment: "plan" },
  { label: "Schedule", segment: "schedule" },
  { label: "Budget", segment: "budget" },
  { label: "Tasks", segment: "tasks" },
  { label: "Run of show", segment: "run-of-show" },
  { label: "Resources", segment: "resources" },
  { label: "Impact review", segment: "review" },
];

type EditionNavProps = {
  clientSlug: string;
  eventSlug: string;
  editionSlug: string;
};

export function EditionNav({ clientSlug, eventSlug, editionSlug }: EditionNavProps) {
  const pathname = usePathname();
  const home = editionPath(clientSlug, eventSlug, editionSlug);

  return (
    <nav className="eo-nav" aria-label="Event sections">
      <div className="eo-nav-inner">
        {sections.map((section) => {
          const href = section.segment ? `${home}/${section.segment}` : home;
          const isActive = section.segment
            ? pathname.startsWith(href)
            : pathname === home;

          return (
            <Link
              key={section.label}
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
