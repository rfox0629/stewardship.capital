import Link from "next/link";

import { mockDashboardSnapshot } from "../../../lib/dashboard/mock-dashboard";

export default function DashboardOverviewPage() {
  const { scores } = mockDashboardSnapshot;
  const pillarEntries = Object.entries(scores.pillarScores);

  return (
    <main className="dashboard-page" aria-labelledby="overview-title">
      <p className="eyebrow">Overview</p>
      <h1 id="overview-title">Welcome back, {mockDashboardSnapshot.userName}.</h1>
      <p>
        Your dashboard is using mock diagnostic data until assessment responses,
        scores, and snapshots are persisted.
      </p>

      <section className="dashboard-score-grid" aria-label="Score summary">
        <article className="dashboard-score-card dashboard-score-card-primary">
          <span>Stewardship Score</span>
          <strong>{scores.stewardshipScore}</strong>
          <p>{scores.confidenceLabels[0]}</p>
        </article>
        <article className="dashboard-score-card">
          <span>Stewardship Stage</span>
          <strong>{scores.stage}</strong>
          <p>Stage language is diagnostic and encouraging.</p>
        </article>
        <article className="dashboard-score-card">
          <span>Profile Completion</span>
          <strong>{mockDashboardSnapshot.profileCompletion}%</strong>
          <p>More detail unlocks after Financial Analysis.</p>
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

      <section className="dashboard-next-step">
        <div>
          <p className="eyebrow">Next recommended step</p>
          <h2>{mockDashboardSnapshot.nextRecommendedStep.title}</h2>
          <p>{mockDashboardSnapshot.nextRecommendedStep.copy}</p>
        </div>
        <Link
          className="button button-primary"
          href={mockDashboardSnapshot.nextRecommendedStep.href}
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
          {mockDashboardSnapshot.lockedModules.map((module) => (
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
