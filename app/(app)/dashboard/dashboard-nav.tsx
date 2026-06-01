"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", href: "/dashboard", shortLabel: "Overview" },
  { label: "Protect", href: "/dashboard/protect", shortLabel: "Protect" },
  { label: "Grow", href: "/dashboard/grow", shortLabel: "Grow" },
  { label: "Transfer", href: "/dashboard/transfer", shortLabel: "Transfer" },
  { label: "Impact", href: "/dashboard/impact", shortLabel: "Impact" },
  { label: "Reports", href: "/dashboard/reports", shortLabel: "Reports" },
];

type DashboardNavProps = {
  variant: "sidebar" | "mobile";
};

export function DashboardNav({ variant }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={variant === "sidebar" ? "app-nav" : "mobile-tab-nav"}
      aria-label="Dashboard sections"
    >
      {navigation.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            data-active={isActive}
            href={item.href}
            key={item.label}
          >
            {variant === "mobile" ? item.shortLabel : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
