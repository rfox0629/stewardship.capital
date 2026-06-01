import Link from "next/link";

import { BrandMark } from "./brand-mark";

const pillars = [
  {
    name: "Protect",
    copy: "Protect what God has entrusted with clear next steps for risk, estate, document, and coverage readiness.",
    accent: "gold",
  },
  {
    name: "Grow",
    copy: "Grow your capacity to serve by seeing where business, practice, real estate, and investment complexity needs attention.",
    accent: "green",
  },
  {
    name: "Transfer",
    copy: "Transfer values and resources to future generations with more clarity around succession, family, and legacy topics.",
    accent: "navy",
  },
  {
    name: "Impact",
    copy: "Impact Kingdom and community by connecting generosity, service, and long-term purpose to your stewardship plan.",
    accent: "green",
  },
];

const workflow = [
  {
    label: "5 Minutes",
    title: "Start with a fast diagnostic.",
    copy: "Answer simple Yes, No, Not Sure, and multiple choice questions without dollar amounts or uploads.",
  },
  {
    label: "Get Clarity",
    title: "Receive your stewardship dashboard.",
    copy: "See your score, stage, pillar snapshot, top priorities, and the next recommended step.",
  },
  {
    label: "Build Over Time",
    title: "Unlock deeper analysis when ready.",
    copy: "Use the dashboard as the source of truth for future opportunities and professional reports.",
  },
];

const scores = [
  { label: "Protect", value: 78 },
  { label: "Grow", value: 64 },
  { label: "Transfer", value: 55 },
  { label: "Impact", value: 91 },
];

const priorities = [
  "Estate Planning",
  "Family Legacy Plan",
  "Emergency Reserves",
];

export default function Home() {
  return (
    <>
      <header className="site-header" id="top">
        <nav className="page-shell nav-bar" aria-label="Main navigation">
          <BrandMark className="brand" href="/" />
          <div className="nav-links">
            <a href="#pillars">Why Stewardship</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#sample-dashboard">Sample Dashboard</a>
            <a href="#clarity">Purpose</a>
          </div>
          <div className="nav-actions">
            <Link className="nav-login" href="/login">
              Log In
            </Link>
            <Link className="button button-primary nav-cta" href="/signup">
              Start Assessment
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="page-shell hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                A Christian-first stewardship operating system
              </p>
              <h1 id="hero-title">Steward What Matters Most.</h1>
              <p className="hero-subheadline">
                Understand, organize, and grow everything God has entrusted to you
                from your finances and business to your family, legacy, and
                impact.
              </p>
              <div className="hero-actions" aria-label="Primary actions">
                <Link className="button button-primary" href="/signup">
                  Start Your Assessment
                </Link>
                <a className="button button-secondary" href="#sample-dashboard">
                  View Sample Dashboard
                </a>
              </div>
              <div className="trust-bullets" aria-label="Assessment details">
                <span>Takes about 5 minutes</span>
                <span>Progress saves automatically</span>
              </div>
            </div>

            <aside
              className="dashboard-preview"
              id="sample-dashboard"
              aria-label="Sample stewardship dashboard"
            >
              <div className="preview-sidebar" aria-hidden="true">
                <BrandMark className="preview-brand" inverted />
                {["Overview", "Protect", "Grow", "Transfer", "Impact"].map(
                  (item) => (
                    <span data-active={item === "Overview"} key={item}>
                      {item}
                    </span>
                  ),
                )}
              </div>

              <div className="preview-content">
                <div className="preview-header">
                  <div>
                    <p className="preview-kicker">Welcome back, Ryan</p>
                    <h2>BUILD Stage</h2>
                    <p>
                      You are actively building your foundation and preparing for
                      the future.
                    </p>
                  </div>
                  <span className="stage-pill">Initial Diagnostic</span>
                </div>

                <div className="score-row">
                  <div className="main-score">
                    <span>Stewardship Score</span>
                    <strong>82</strong>
                    <p>Strong</p>
                  </div>
                  <div className="profile-score">
                    <span>Profile Completion</span>
                    <strong>32%</strong>
                    <div className="meter-track" aria-hidden="true">
                      <span style={{ width: "32%" }} />
                    </div>
                  </div>
                </div>

                <div className="pillar-meter-grid" aria-label="Pillar scores">
                  {scores.map((score) => (
                    <div className="pillar-meter" key={score.label}>
                      <div>
                        <span>{score.label}</span>
                        <strong>{score.value}</strong>
                      </div>
                      <div className="meter-track" aria-hidden="true">
                        <span style={{ width: `${score.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="preview-lower-grid">
                  <div className="priority-panel">
                    <p className="panel-label">Top Priorities</p>
                    <ol>
                      {priorities.map((priority) => (
                        <li key={priority}>{priority}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="next-step">
                    <span>Next Recommended Step</span>
                    <strong>Complete Financial Analysis</strong>
                    <p>Unlock deeper insights when you are ready.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="section" id="pillars" aria-labelledby="pillars-title">
          <div className="page-shell">
            <div className="section-heading">
              <p className="eyebrow">Four pillars</p>
              <h2 id="pillars-title">A clear frame for faithful stewardship.</h2>
            </div>
            <div className="pillar-grid">
              {pillars.map((pillar) => (
                <article
                  className={`pillar-card pillar-card-${pillar.accent}`}
                  key={pillar.name}
                >
                  <span aria-hidden="true" />
                  <h3>{pillar.name}</h3>
                  <p>{pillar.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="section section-muted"
          id="how-it-works"
          aria-labelledby="workflow-title"
        >
          <div className="page-shell">
            <div className="section-heading">
              <p className="eyebrow">How it works</p>
              <h2 id="workflow-title">Simple enough to start today.</h2>
            </div>
            <div className="workflow-grid">
              {workflow.map((step, index) => (
                <article className="workflow-step" key={step.label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p className="step-label">{step.label}</p>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="clarity-section"
          id="clarity"
          aria-labelledby="clarity-title"
        >
          <div className="page-shell clarity-inner">
            <p className="eyebrow">Clarity and purpose</p>
            <h2 id="clarity-title">
              Clarity brings confidence.
              <span>Stewardship brings purpose.</span>
            </h2>
            <p>
              Stewardship Capital helps Christian households move from scattered
              financial complexity to a dashboard-driven view of what needs
              attention, what can grow, what should transfer, and what can create
              lasting impact.
            </p>
          </div>
        </section>

        <section className="scripture-cta" id="assessment">
          <div className="page-shell scripture-inner">
            <div>
              <p className="scripture-quote">
                To whom much is given, much is required.
              </p>
              <p className="scripture-reference">Luke 12:48</p>
            </div>
            <Link className="button button-light" href="/signup">
              Start Your Stewardship Assessment
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
