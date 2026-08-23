import Link from "next/link";

import { MultiplierField } from "./_components/multiplier-field";
import { PanelField, type PanelMode } from "./_components/panel-field";
import { Wordmark } from "./_components/wordmark";
import { products } from "./_lib/products";

type Panel = {
  index: string;
  name: string;
  category: string;
  status: string;
  proposition: string;
  mode: PanelMode;
  href: string;
  cta: string;
};

/* The register drives the panels, so adding a company never means editing
   this page. The last panel is capacity rather than a product. */
const panels: Panel[] = [
  ...products.map((product) => ({
    index: product.index,
    name: product.name,
    category: product.category,
    status: product.status,
    proposition: product.proposition,
    mode: product.mode,
    href: `/work/${product.slug}`,
    cta: `Enter ${product.name.split(" ")[0]}`,
  })),
  {
    index: "03",
    name: "The next one",
    category: "Capacity",
    status: "Open",
    proposition: "Built to hold what has not started yet.",
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
          <div className="mask">
            <p className="hero-mark">
              <Wordmark />
            </p>
          </div>
          <div className="mask">
            <h1 id="hero-title">Build what matters.</h1>
          </div>
          <div className="mask">
            <p className="hero-sub">
              We turn vision into systems, products, and experiences built to
              move.
            </p>
          </div>
          <div className="mask">
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
        </div>
      </section>

      <section className="building" id="building" aria-labelledby="building-title">
        <p className="section-label" id="building-title">
          What we&apos;re building
        </p>

        {panels.map((panel) => (
          <article className="panel" key={panel.name}>
            <PanelField mode={panel.mode} />
            <div className="panel-inner" data-reveal>
              <div className="panel-meta">
                <span className="panel-index">{panel.index}</span>
                <span className="panel-category">{panel.category}</span>
                <span className="chip">{panel.status}</span>
              </div>
              <h2>{panel.name}</h2>
              <p className="panel-prop">{panel.proposition}</p>
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
            </div>
          </article>
        ))}
      </section>

      <section className="connect" aria-labelledby="connect-title">
        <h2 id="connect-title" data-reveal>
          Something entrusted to you,
          <span>waiting to be built?</span>
        </h2>
        <a
          className="connect-link"
          href="mailto:hello@stewardship.capital"
          data-reveal
        >
          hello@stewardship.capital
        </a>
      </section>
    </>
  );
}
