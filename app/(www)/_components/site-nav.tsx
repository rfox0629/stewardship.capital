"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Wordmark } from "./wordmark";

const links = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Connect", href: "/connect" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="nav" data-scrolled={scrolled ? "true" : undefined}>
        <Link className="nav-brand" href="/" aria-label="Stewardship.Capital home">
          <Wordmark />
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((link, index) => (
            <span key={link.href}>
              <Link href={link.href}>{link.label}</Link>
              {index < links.length - 1 ? (
                <i aria-hidden="true" className="nav-sep">
                  ·
                </i>
              ) : null}
            </span>
          ))}
        </nav>

        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-overlay"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      <div className="nav-overlay" id="nav-overlay" data-open={open ? "true" : undefined}>
        <nav aria-label="Primary mobile">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
