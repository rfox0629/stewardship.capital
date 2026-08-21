import Link from "next/link";

import { MultiplierField } from "./_components/multiplier-field";
import { PanelField, type PanelMode } from "./_components/panel-field";
import { Wordmark } from "./_components/wordmark";

type Panel = {
  index: string;
  name: string;
  category: string;
  status: string;
  proposition: string;
  pending?: boolean;
  mode: PanelMode;
  href?: string;
  cta?: string;
};

const panels: Panel[] = [
  {
    index: "01",
    name: "Spark",
    category: "Event operating system",
    status: "Founder preview",
    proposition:
      "Ideas become a confirmed plan. Every schedule item, budget line, and task traces back to the idea that caused it.",
    mode: "converge",
    href: "/work/spark",
    cta: "Enter Spark",
  },
  {
    index: "02",
    name: "AutoPilot Strategies",
    category: "Company",
    status: "In development",
    proposition: "One line about AutoPilot Strategies goes here.",
    pending: true,
    mode: "path",
    href: "/work/autopilot-strategies",
    cta: "Enter AutoPilot",
  },
  {
    index: "03",
    name: "The next one",
    category: "Capacity",
    status: "Open",
    proposition:
      "The architecture is built to hold what has not been started yet. Entrusted ideas, companies, and relationships go in. Working things come out.",
    mode: "latent",
    href: "/connect",
    cta: "Start something",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <MultiplierField />
        <div className="hero-inner">
          <p className="hero-mark">
            <Wordmark />
          </p>
          <h1 id="hero-title">Build what matters.</h1>
          <p className="hero-sub">
            We turn vision into systems, products, and experiences built to
            move.
          </p>
          <Link className="explore" href="#building">
            Explore
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 12h15M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      <section className="building" id="building" aria-labelledby="building-title">
        <p className="section-label" id="building-title">
          What we&apos;re building
        </p>

        {panels.map((panel) => (
          <article className="panel" key={panel.name}>
            <PanelField mode={panel.mode} />
            <div className="panel-inner">
              <div className="panel-meta">
                <span className="panel-index">{panel.index}</span>
                <span className="panel-category">{panel.category}</span>
                <span className="chip" data-pending={panel.pending ? "true" : undefined}>
                  {panel.status}
                </span>
              </div>
              <h2>{panel.name}</h2>
              <p className="panel-prop" data-pending={panel.pending ? "true" : undefined}>
                {panel.proposition}
              </p>
              {panel.href ? (
                <Link className="panel-cta" href={panel.href}>
                  {panel.cta}
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M4 12h15M13 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="connect" aria-labelledby="connect-title">
        <h2 id="connect-title">
          Something entrusted to you,
          <span>waiting to be built?</span>
        </h2>
        <a className="connect-link" href="mailto:hello@stewardship.capital">
          hello@stewardship.capital
        </a>
      </section>
    </>
  );
}
