"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ScMark } from "./sc-mark";

const links = [
  { label: "The trust", href: "/#trust" },
  { label: "The movement", href: "/#movement" },
  { label: "Expressions", href: "/#expressions" },
  { label: "Events", href: "/events" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  /* On a page that opens with the splash, the header holds back until the
     reader scrolls past it. */
  const [overSplash, setOverSplash] = useState(false);

  useEffect(() => {
    const splash = document.querySelector(".sc-splash");

    const onScroll = () => {
      setOverSplash(
        Boolean(splash) && window.scrollY < window.innerHeight * 0.72,
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className="sc-header"
      data-splash={overSplash ? "true" : undefined}
    >
      <div className="sc-header-inner">
        <ScMark href="/" />

        <nav className="sc-nav" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sc-header-actions">
          <Link className="sc-button sc-button-quiet" href="/#invitation">
            Connect
          </Link>
          <button
            className="sc-nav-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="sc-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sc-visually-hidden">
              {open ? "Close menu" : "Open menu"}
            </span>
            <span aria-hidden="true" data-open={open ? "true" : undefined} />
          </button>
        </div>
      </div>

      <div className="sc-mobile-nav" id="sc-mobile-nav" data-open={open ? "true" : undefined}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link href="/#invitation" onClick={() => setOpen(false)}>
          Connect
        </Link>
      </div>
    </header>
  );
}
