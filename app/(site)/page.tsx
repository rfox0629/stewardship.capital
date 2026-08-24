import Link from "next/link";

import { BraidDiagram } from "./_components/braid-diagram";
import { MovementRail } from "./_components/movement-rail";
import { SplashHero } from "./_components/splash-hero";
import { StrandField } from "./_components/strand-field";

const strands = [
  {
    key: "time",
    name: "Time",
    copy: "The hours, seasons, and attention you have been given.",
    meta: ["Seasons", "Attention", "Presence"],
  },
  {
    key: "talent",
    name: "Talent",
    copy: "The skill, wisdom, and influence you carry into your work.",
    meta: ["Work", "Gifts", "Influence"],
  },
  {
    key: "treasure",
    name: "Treasure",
    copy: "The assets, income, and generosity placed in your care.",
    meta: ["Assets", "Income", "Giving"],
  },
];

export default function HomePage() {
  return (
    <>
      <SplashHero />

      <section className="sc-hero" id="statement" aria-labelledby="sc-hero-title">
        <div className="sc-shell sc-hero-inner">
          <p className="sc-eyebrow" data-sc-reveal>
            What we are
          </p>
          <h2 id="sc-hero-title" data-sc-reveal style={{ transitionDelay: "90ms" }}>
            Everything entrusted.
            <span>Faithfully stewarded.</span>
          </h2>
          <p className="sc-hero-lede" data-sc-reveal style={{ transitionDelay: "180ms" }}>
            Time, talent, and treasure are one trust. We help people, families,
            organizations, and ventures bring vision into faithful execution.
          </p>
          <div className="sc-hero-actions" data-sc-reveal style={{ transitionDelay: "260ms" }}>
            <Link className="sc-button sc-button-primary" href="#trust">
              See the system
            </Link>
            <Link className="sc-button sc-button-ghost" href="#expressions">
              What we build
            </Link>
          </div>
        </div>

        <div className="sc-hero-field">
          <StrandField />
        </div>

        <div className="sc-hero-scroll" aria-hidden="true">
          <span />
        </div>
      </section>

      <section className="sc-section sc-trust" id="trust" aria-labelledby="sc-trust-title">
        <div className="sc-shell">
          <div className="sc-section-head">
            <p className="sc-eyebrow" data-sc-reveal>
              The trust
            </p>
            <h2 id="sc-trust-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
              Three strands, one trust.
            </h2>
          </div>

          <div className="sc-strand-grid">
            {strands.map((strand, index) => (
              <article
                className="sc-strand-card"
                data-strand={strand.key}
                data-sc-reveal
                style={{ transitionDelay: `${index * 90}ms` }}
                key={strand.key}
                tabIndex={0}
              >
                <span className="sc-strand-rule" aria-hidden="true" />
                <h3>{strand.name}</h3>
                <p>{strand.copy}</p>
                <ul className="sc-strand-meta">
                  {strand.meta.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="sc-section sc-convergence"
        aria-labelledby="sc-convergence-title"
      >
        <div className="sc-braid-wrap" aria-hidden="false" data-sc-reveal>
          <BraidDiagram />
        </div>
        <div className="sc-shell sc-convergence-inner">
          <p className="sc-eyebrow sc-eyebrow-invert" data-sc-reveal>
            Convergence
          </p>
          <h2 id="sc-convergence-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
            Held together, or not really held.
          </h2>
          <p data-sc-reveal style={{ transitionDelay: "160ms" }}>
            Most households track treasure closely, time loosely, and talent not
            at all. Stewardship is what happens when the three stop being
            separate problems.
          </p>
        </div>
      </section>

      <section className="sc-section sc-movement" id="movement" aria-labelledby="sc-movement-title">
        <div className="sc-shell">
          <div className="sc-section-head">
            <p className="sc-eyebrow" data-sc-reveal>
              The movement
            </p>
            <h2 id="sc-movement-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
              From entrusted to purposeful impact.
            </h2>
          </div>
          <MovementRail />
        </div>
      </section>

      <section className="sc-section sc-expressions" id="expressions" aria-labelledby="sc-expressions-title">
        <div className="sc-shell">
          <div className="sc-section-head">
            <p className="sc-eyebrow" data-sc-reveal>
              Expressions
            </p>
            <h2 id="sc-expressions-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
              What gets built on the system.
            </h2>
          </div>

          <div className="sc-expression-grid">
            <article className="sc-expression" data-sc-reveal>
              <div className="sc-expression-art sc-expression-art-os" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="sc-expression-kicker">Operating System</p>
              <h3>Stewardship for the whole household.</h3>
              <p>
                Understand, organize, and grow everything entrusted to a family,
                a business owner, or an investor.
              </p>
              <p className="sc-expression-status">In private development</p>
            </article>

            <article className="sc-expression" data-sc-reveal style={{ transitionDelay: "110ms" }}>
              <div className="sc-expression-art sc-expression-art-events" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="sc-expression-kicker">Stewardship Events</p>
              <h3>Gatherings that carry a mission.</h3>
              <p>
                Ideas, decisions, schedule, and budget in one place, so a team
                can plan a gathering without losing the point of it.
              </p>
              <Link className="sc-expression-link" href="/events">
                Explore Stewardship Events
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="sc-invitation" id="invitation" aria-labelledby="sc-invitation-title">
        <div className="sc-shell sc-invitation-inner">
          <blockquote data-sc-reveal>
            <p>To whom much is given, much is required.</p>
            <cite>Luke 12:48</cite>
          </blockquote>
          <h2 id="sc-invitation-title" data-sc-reveal style={{ transitionDelay: "90ms" }}>
            If you are stewarding something that matters, we would like to hear
            about it.
          </h2>
          <a
            className="sc-button sc-button-primary"
            href="mailto:hello@stewardship.capital"
            data-sc-reveal
            style={{ transitionDelay: "170ms" }}
          >
            hello@stewardship.capital
          </a>
        </div>
      </section>
    </>
  );
}
