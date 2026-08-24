import type { Metadata } from "next";
import Link from "next/link";

import { EventsMark } from "./_components/ui";
import { plannerPath } from "./_lib/paths";
import "./events-os.css";

export const metadata: Metadata = {
  title: {
    default: "Stewardship Events",
    template: "%s | Stewardship Events",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function EventsOsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="eo-frame">
      <header className="eo-topbar">
        <div className="eo-topbar-inner">
          <Link className="eo-product" href={plannerPath()}>
            <EventsMark />
            Stewardship Events
          </Link>
          <div className="eo-topbar-right">
            <span className="eo-preview-flag">
              <span className="eo-preview-flag-long">Founder preview, seeded data</span>
              <span className="eo-preview-flag-short">Preview</span>
            </span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
