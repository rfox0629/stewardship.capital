"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type EventNavItem = { href: string; label: string; also?: string[] };

/**
 * The engagement's own navigation. Client side only for the active state;
 * which links exist at all is decided on the server from the person's role,
 * so this component never learns about surfaces its reader cannot open.
 * `also` lets one door cover several routes: Plan is lit on the schedule
 * too, because the schedule is the Weekend side of the Plan.
 */
export function EventNav({ items }: { items: EventNavItem[] }) {
  const pathname = usePathname();

  const active = (item: EventNavItem) =>
    pathname === item.href || (item.also ?? []).some((path) => pathname === path);

  return (
    <nav className="ev-nav" aria-label="Event">
      <div className="ev-shell ev-nav-inner">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
