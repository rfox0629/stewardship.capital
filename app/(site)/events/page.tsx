import type { Metadata } from "next";
import Link from "next/link";

import { SparkToPlanDiagram } from "../_components/spark-plan-diagram";

export const metadata: Metadata = {
  title: "Stewardship Events",
  description:
    "Stewardship Events is an operating system for gatherings that carry a mission. Ideas, decisions, schedule, and budget in one place.",
};

const workflow = [
  { name: "Spark", copy: "Every idea lands in one place, without cluttering the plan." },
  { name: "Discuss", copy: "The team weighs it together instead of over scattered messages." },
  { name: "Approve", copy: "A decision gets made, recorded, and owned." },
  { name: "Build", copy: "The approved idea becomes schedule, budget, tasks, and supplies." },
  { name: "Confirm", copy: "Only settled work reaches the confirmed plan." },
  { name: "Reflect", copy: "What worked carries into the next edition." },
];

const holds = [
  { name: "Event plan", copy: "The single view of what this gathering is and who owns it." },
  { name: "Confirmed schedule", copy: "Day by day, with owners, locations, and run of show cues." },
  { name: "Budget", copy: "Planned against committed and actual, by category and by owner." },
  { name: "Resources", copy: "Vendors, supplies, and the people bringing them." },
];

export default function EventsPage() {
  return (
    <>
      <section className="sc-events-hero" aria-labelledby="sc-events-title">
        <div className="sc-shell sc-events-hero-inner">
          <p className="sc-eyebrow" data-sc-reveal>
            A Stewardship Capital product
          </p>
          <h1 id="sc-events-title" data-sc-reveal style={{ transitionDelay: "90ms" }}>
            Stewardship Events
          </h1>
          <p className="sc-events-lede" data-sc-reveal style={{ transitionDelay: "170ms" }}>
            An operating system for gatherings that carry a mission. Ideas,
            decisions, schedule, and budget in one place, so a team can plan
            well without losing the point of it.
          </p>
          <div className="sc-hero-actions" data-sc-reveal style={{ transitionDelay: "240ms" }}>
            <Link className="sc-button sc-button-primary" href="/events-os">
              Open the founder preview
            </Link>
            <Link className="sc-button sc-button-ghost" href="/#expressions">
              Back to Stewardship Capital
            </Link>
          </div>
        </div>

        <div className="sc-events-field">
          <SparkToPlanDiagram />
        </div>
      </section>

      <section className="sc-section sc-flow-section" aria-labelledby="sc-flow-title">
        <div className="sc-shell">
          <div className="sc-section-head">
            <p className="sc-eyebrow" data-sc-reveal>
              The workflow
            </p>
            <h2 id="sc-flow-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
              Ideas belong in Sparks first.
            </h2>
            <p className="sc-section-lede" data-sc-reveal style={{ transitionDelay: "150ms" }}>
              Most event plans break because good ideas and confirmed decisions
              live in the same list. Stewardship Events keeps them apart until
              an idea has actually been approved.
            </p>
          </div>

          <ol className="sc-flow">
            {workflow.map((step, index) => (
              <li key={step.name} data-sc-reveal style={{ transitionDelay: `${index * 70}ms` }}>
                <span className="sc-flow-marker" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.name}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sc-section sc-holds-section" aria-labelledby="sc-holds-title">
        <div className="sc-shell">
          <div className="sc-section-head">
            <p className="sc-eyebrow" data-sc-reveal>
              What it holds
            </p>
            <h2 id="sc-holds-title" data-sc-reveal style={{ transitionDelay: "80ms" }}>
              Simple at the surface, powerful underneath.
            </h2>
          </div>

          <div className="sc-holds-grid">
            {holds.map((item, index) => (
              <article key={item.name} data-sc-reveal style={{ transitionDelay: `${index * 80}ms` }}>
                <h3>{item.name}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sc-invitation" aria-labelledby="sc-events-cta-title">
        <div className="sc-shell sc-invitation-inner">
          <h2 id="sc-events-cta-title" data-sc-reveal>
            Building a gathering that carries a mission?
          </h2>
          <a
            className="sc-button sc-button-primary"
            href="mailto:hello@stewardship.capital"
            data-sc-reveal
            style={{ transitionDelay: "120ms" }}
          >
            hello@stewardship.capital
          </a>
        </div>
      </section>
    </>
  );
}
