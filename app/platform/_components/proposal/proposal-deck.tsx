"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import "./proposal.css";

import {
  infrastructureMonthly,
  money,
  type Proposal,
  type ProposalSectionKey,
} from "@lib/platform/proposals";
import { FuturePlatform } from "./future-platform";
import { LiveDemo } from "./live-demo";

/**
 * The proposal as an executive presentation.
 *
 * Five sections behind one row of tabs, a presentation mode that takes the
 * screen and moves with the arrow keys, and the presenter's mark at the top.
 * The same deck renders for staff inside the platform and for the person a
 * share link names; only the frame around it knows which.
 */

type Props = {
  proposal: Proposal;
  audience: "staff" | "shared";
  /** Where the staff frame goes back to. */
  backHref?: string;
  backLabel?: string;
  /** Who a shared link was issued to, shown so the page says who it is for. */
  sharedWith?: string;
};

const isSectionKey = (value: string, proposal: Proposal): value is ProposalSectionKey =>
  proposal.sections.some((section) => section.key === value);

function PresenterMark() {
  return (
    <span className="pd-mark" aria-label="TentMAiKER">
      <span aria-hidden="true">
        TENTM<span className="pd-mark-ai">Ai</span>KER
      </span>
    </span>
  );
}

export function ProposalDeck({ proposal, audience, backHref, backLabel, sharedWith }: Props) {
  const [active, setActive] = useState<ProposalSectionKey>("overview");
  const [present, setPresent] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const index = proposal.sections.findIndex((section) => section.key === active);

  const go = useCallback(
    (key: ProposalSectionKey) => {
      setActive(key);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${key}`);
        rootRef.current?.scrollTo({ top: 0 });
        if (!present) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [present],
  );

  const step = useCallback(
    (delta: number) => {
      const next = proposal.sections[index + delta];
      if (next) go(next.key);
    },
    [go, index, proposal.sections],
  );

  /* The address names the section: follow it on arrival and whenever it
     changes. The arrival case is the same subscription, fired once, so the
     deck has one way of reading the hash rather than two. */
  useEffect(() => {
    const follow = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && isSectionKey(hash, proposal)) {
        setActive(hash);
        rootRef.current?.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("hashchange", follow);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return () => window.removeEventListener("hashchange", follow);
  }, [proposal]);

  /* Presentation mode: the browser's full screen when it offers one, and the
     same layout without it when it does not. Leaving full screen by any
     means ends the mode. */
  const enterPresent = useCallback(async () => {
    setPresent(true);
    const root = rootRef.current;
    /* The deck becomes its own scroll container; start it at the top rather
       than wherever the page had been scrolled to. */
    window.scrollTo({ top: 0 });
    root?.scrollTo({ top: 0 });
    if (root?.requestFullscreen) {
      try {
        await root.requestFullscreen({ navigationUI: "hide" });
      } catch {
        /* The layout still presents without the API. */
      }
    }
  }, []);

  const exitPresent = useCallback(async () => {
    setPresent(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* Already out. */
      }
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setPresent(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /* Typing fields keep their keys. A focused button does not: the arrows
         should still turn the page right after Present was pressed. */
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Escape" && present) {
        void exitPresent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPresent, present, step]);

  const infra = proposal.investment.infrastructure;

  return (
    <div ref={rootRef} className="pd" data-present={present ? "true" : "false"}>
      <header className="pd-top">
        <div className="pd-top-left">
          <PresenterMark />
          <span className="pd-top-for">
            <span className="pd-top-for-label">prepared for</span>
            <Image
              className="pd-client-logo"
              src="/clients/shine/shine-logo.png"
              alt="SHINE"
              width={500}
              height={260}
              priority
            />
          </span>
        </div>
        <div className="pd-top-right">
          {audience === "staff" && backHref ? (
            <Link className="pd-top-link" href={backHref}>
              <span aria-hidden="true">&larr;</span> {backLabel ?? "Client portal"}
            </Link>
          ) : null}
          {audience === "shared" && sharedWith ? (
            <span className="pd-top-note">Shared with {sharedWith}</span>
          ) : null}
          {present ? (
            <button type="button" className="pd-top-button" onClick={() => void exitPresent()}>
              Exit presentation
            </button>
          ) : (
            <button type="button" className="pd-top-button" onClick={() => void enterPresent()}>
              Present
            </button>
          )}
        </div>
      </header>

      <nav className="pd-nav" aria-label="Proposal sections">
        {proposal.sections.map((section, i) => (
          <button
            key={section.key}
            type="button"
            className="pd-tab"
            aria-current={section.key === active ? "page" : undefined}
            onClick={() => go(section.key)}
          >
            <span className="pd-tab-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="pd-tab-label">{section.label}</span>
          </button>
        ))}
      </nav>

      <main className="pd-main">
        {active === "overview" ? (
          <section className="pd-section" aria-labelledby="pd-overview">
            <p className="pd-eyebrow">{proposal.title}</p>
            <h1 id="pd-overview" className="pd-h1">
              {proposal.overview.headline}
            </h1>
            <p className="pd-lede">{proposal.overview.lede}</p>

            <div className="pd-pillars">
              {proposal.overview.pillars.map((pillar, i) => (
                <div key={pillar.title} className="pd-pillar">
                  <span className="pd-pillar-num">{String(i + 1).padStart(2, "0")}</span>
                  <h2>{pillar.title}</h2>
                  <p>{pillar.body}</p>
                </div>
              ))}
            </div>

            <blockquote className="pd-vision">
              <p>{proposal.overview.vision}</p>
            </blockquote>
          </section>
        ) : null}

        {active === "demo" ? (
          <section className="pd-section" aria-labelledby="pd-demo">
            <p className="pd-eyebrow">Live demo</p>
            <h1 id="pd-demo" className="pd-h1 pd-h1-small">
              The platform, running on demo data.
            </h1>
            <p className="pd-lede">
              Change the period or region, add a field report, and watch the executive view
              follow. Everything on this screen is fixture data made for the demo. No ministry
              record is read or written.
            </p>
            <LiveDemo />
          </section>
        ) : null}

        {active === "future" ? (
          <section className="pd-section" aria-labelledby="pd-future">
            <p className="pd-eyebrow">Future platform</p>
            <h1 id="pd-future" className="pd-h1 pd-h1-small">
              A foundation that can carry the whole organization.
            </h1>
            <p className="pd-lede">{proposal.overview.vision}</p>
            <FuturePlatform
              foundation={proposal.future.foundation}
              modules={proposal.future.modules}
              exclusion={proposal.future.exclusion}
            />
          </section>
        ) : null}

        {active === "investment" ? (
          <section className="pd-section" aria-labelledby="pd-investment">
            <p className="pd-eyebrow">Investment</p>
            <h1 id="pd-investment" className="pd-h1 pd-h1-small">
              One fixed figure. Everything to launch is in it.
            </h1>

            <div className="pd-hero-stats">
              <div className="pd-stat pd-stat-lead">
                <span className="pd-stat-value">{money(proposal.investment.total)}</span>
                <span className="pd-stat-label">{proposal.investment.headlines[0]}</span>
              </div>
              <div className="pd-stat">
                <span className="pd-stat-value">{proposal.investment.timeline}</span>
                <span className="pd-stat-label">{proposal.investment.headlines[1]}</span>
              </div>
              <div className="pd-stat">
                <span className="pd-stat-value">6 months</span>
                <span className="pd-stat-label">{proposal.investment.headlines[2]}</span>
              </div>
              <div className="pd-stat">
                <span className="pd-stat-value">Yours</span>
                <span className="pd-stat-label">{proposal.investment.headlines[3]}</span>
              </div>
            </div>

            <h2 className="pd-h2">Payment milestones</h2>
            <ol className="pd-milestones">
              {proposal.investment.milestones.map((milestone, i) => (
                <li key={milestone.label} className="pd-milestone">
                  <span className="pd-milestone-num">{i + 1}</span>
                  <span className="pd-milestone-amount">{money(milestone.amount)}</span>
                  <span className="pd-milestone-label">{milestone.label}</span>
                  <span className="pd-milestone-note">{milestone.note}</span>
                </li>
              ))}
            </ol>

            <h2 className="pd-h2">Included</h2>
            <ul className="pd-chips" aria-label="Included in the investment">
              {proposal.investment.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2 className="pd-h2">Platform infrastructure</h2>
            <div className="pd-infra">
              <table className="pd-infra-table">
                <tbody>
                  {infra.lines.map((line) => (
                    <tr key={line.label}>
                      <th scope="row">{line.label}</th>
                      <td>{money(line.amount)}/month estimated</td>
                    </tr>
                  ))}
                  <tr className="pd-infra-total">
                    <th scope="row">Total anticipated infrastructure</th>
                    <td>
                      <span className="pd-sr">{money(infrastructureMonthly(proposal))} itemized, </span>
                      {infra.totalRange}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="pd-infra-notes">
                <p className="pd-infra-coverage">{infra.coverage}</p>
                <p className="pd-infra-boundary">{infra.boundary}</p>
              </div>
            </div>
          </section>
        ) : null}

        {active === "ownership" ? (
          <section className="pd-section" aria-labelledby="pd-ownership">
            <p className="pd-eyebrow">Ownership &amp; continuity</p>
            <h1 id="pd-ownership" className="pd-h1 pd-h1-small">
              Six months covered. Then the choice is SHINE&rsquo;s.
            </h1>
            <OwnershipTimeline proposal={proposal} />

            <div className="pd-close">
              <p className="pd-close-line">{proposal.close.line}</p>
              <p className="pd-close-by">
                {proposal.close.byline.replace(/TentMAiKER\.?$/, "")}
                <PresenterMark />
              </p>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="pd-foot">
        <button
          type="button"
          className="pd-step"
          onClick={() => step(-1)}
          disabled={index <= 0}
          aria-label="Previous section"
        >
          &larr;
        </button>
        <span className="pd-dots" aria-hidden="true">
          {proposal.sections.map((section) => (
            <span key={section.key} className="pd-dot" data-on={section.key === active} />
          ))}
        </span>
        <button
          type="button"
          className="pd-step"
          onClick={() => step(1)}
          disabled={index >= proposal.sections.length - 1}
          aria-label="Next section"
        >
          &rarr;
        </button>
      </footer>
    </div>
  );
}

function OwnershipTimeline({ proposal }: { proposal: Proposal }) {
  const [open, setOpen] = useState<string>(proposal.ownership.paths[0]?.key ?? "");
  const months = proposal.ownership.coveredMonths;

  return (
    <div className="pd-timeline">
      <ol className="pd-track" aria-label="Timeline after launch">
        <li className="pd-track-launch">
          <span className="pd-track-dot" aria-hidden="true" />
          <span className="pd-track-label">Launch and handoff</span>
          <span className="pd-track-note">The application is SHINE&rsquo;s from this day.</span>
        </li>
        <li className="pd-track-covered">
          <span className="pd-track-band" aria-hidden="true" />
          <span className="pd-track-label">
            Months 1 to {months}: infrastructure covered
          </span>
          <span className="pd-track-note">
            TentMAiKER carries the standard infrastructure cost. Nothing to arrange.
          </span>
        </li>
        <li className="pd-track-choice">
          <span className="pd-track-dot pd-track-dot-open" aria-hidden="true" />
          <span className="pd-track-label">Month {months + 1} onward: three paths</span>
          <span className="pd-track-note">{proposal.ownership.noCommitment}</span>
        </li>
      </ol>

      <div className="pd-paths" role="tablist" aria-label="Paths after the covered period">
        {proposal.ownership.paths.map((path) => (
          <button
            key={path.key}
            type="button"
            role="tab"
            aria-selected={open === path.key}
            className="pd-path"
            onClick={() => setOpen(path.key)}
          >
            <span className="pd-path-name">{path.name}</span>
          </button>
        ))}
      </div>
      {proposal.ownership.paths
        .filter((path) => path.key === open)
        .map((path) => (
          <div key={path.key} role="tabpanel" className="pd-path-panel">
            <h2>{path.name}</h2>
            <p>{path.summary}</p>
          </div>
        ))}
    </div>
  );
}
