import Link from "next/link";

import { getLatestDashboardSnapshot } from "../../../lib/assessment/assessment-repository";
import type { AssessmentPillar } from "../../../lib/assessment/questions";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const dashboard = await getLatestDashboardSnapshot();

  if (!dashboard) {
    return (
      <main className="dashboard-page" aria-labelledby="overview-title">
        <section className="dashboard-empty-hero">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 id="overview-title">Create your stewardship dashboard.</h1>
            <p>
              Complete the fast diagnostic assessment to create your first
              dashboard snapshot, scores, stage, and top priorities. The first
              step stays light: no dollar amounts, no uploads, and no account
              connections.
            </p>
          </div>
          <Link className="button button-primary" href="/assessment">
            Start Your Assessment
          </Link>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">What unlocks next</p>
            <h2>No completed assessment yet.</h2>
          </div>
          <p>
            Your dashboard will show a Stewardship Score, stage, pillar
            snapshot, top priorities, and the next recommended step after the
            assessment is complete.
          </p>
        </section>
      </main>
    );
  }

  const { scores } = dashboard;
  const pillarEntries = Object.entries(scores.pillarScores) as [
    AssessmentPillar,
    number,
  ][];

  return (
    <main className="dashboard-page" aria-labelledby="overview-title">
      <section className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Overview</p>
          <h1 id="overview-title">Welcome back, {dashboard.userName}.</h1>
          <p>
            Your latest assessment created this stewardship snapshot. Review
            what needs attention first, then complete Financial Analysis when
            you are ready for deeper planning context.
          </p>
        </div>
        <div className="dashboard-hero-score">
          <span>Stewardship Score</span>
          <strong>{scores.stewardshipScore}</strong>
          <p>{scores.stage.toUpperCase()} Stage</p>
        </div>
      </section>

      <section className="dashboard-score-grid" aria-label="Score summary">
        <article className="dashboard-score-card">
          <span>Stewardship Score</span>
          <strong>{scores.stewardshipScore}</strong>
          <p>{scores.confidenceLabels[0]}</p>
        </article>
        <article className="dashboard-score-card dashboard-score-card-primary">
          <span>Stewardship Stage</span>
          <strong>{scores.stage.toUpperCase()}</strong>
          <p>Stage language is diagnostic and encouraging.</p>
        </article>
        <article className="dashboard-score-card">
          <span>Profile Completion</span>
          <strong>{dashboard.profileCompletion}%</strong>
          <p>More detail unlocks after Financial Analysis.</p>
        </article>
        <article className="dashboard-score-card">
          <span>Financial Readiness</span>
          <strong>{scores.financialReadinessScore}</strong>
          <p>Planning readiness based on the diagnostic.</p>
        </article>
        <article className="dashboard-score-card">
          <span>Legacy Impact</span>
          <strong>{scores.legacyImpactScore}</strong>
          <p>Transfer, generosity, and long-term stewardship signals.</p>
        </article>
      </section>

      <section className="dashboard-two-column">
        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">Pillar snapshot</p>
            <h2>Protect, Grow, Transfer, Impact.</h2>
          </div>
          <div className="dashboard-pillar-grid">
            {pillarEntries.map(([pillar, score]) => (
              <article className="dashboard-pillar-card" key={pillar}>
                <div>
                  <span>{pillar}</span>
                  <strong>{score}</strong>
                </div>
                <div className="meter-track" aria-hidden="true">
                  <span style={{ width: `${score}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">Top priorities</p>
            <h2>What needs attention first.</h2>
          </div>
          <ol className="dashboard-priority-list">
            {scores.topPriorities.map((priority) => (
              <li key={priority.title}>
                <strong>{priority.title}</strong>
                <span>{priority.pillar}</span>
                <p>{priority.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="dashboard-next-step dashboard-next-step-prominent">
        <div>
          <p className="eyebrow">Next recommended step</p>
          <h2>{dashboard.nextRecommendedStep.title}</h2>
          <p>{dashboard.nextRecommendedStep.copy}</p>
        </div>
        <Link
          className="button button-primary"
          href={dashboard.nextRecommendedStep.href}
        >
          Complete Financial Analysis
        </Link>
      </section>

      <section className="dashboard-panel" aria-labelledby="locked-modules-title">
        <div className="dashboard-panel-heading">
          <p className="eyebrow">Locked future modules</p>
          <h2 id="locked-modules-title">More opens as your profile deepens.</h2>
        </div>
        <div className="locked-module-grid">
          {dashboard.lockedModules.map((module) => (
            <article className="locked-module-card" key={module}>
              <span>Locked</span>
              <strong>{module}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
