import Link from "next/link";

import { getLatestDashboardSnapshot } from "../../../lib/assessment/assessment-repository";
import type { AssessmentPillar } from "../../../lib/assessment/questions";
import type { StewardshipStage } from "../../../lib/scoring/stewardship-scoring";

export const dynamic = "force-dynamic";

const stageExplanations: Record<StewardshipStage, string> = {
  Survive:
    "Your first step is creating clarity and basic protection around what God has entrusted to you.",
  Stabilize:
    "You have some foundation in place and are ready to reduce uncertainty with a clearer plan.",
  Build:
    "You are building a stronger foundation and preparing for more coordinated stewardship decisions.",
  Multiply:
    "You have growing capacity and complexity, making coordinated planning and impact clarity more important.",
  Legacy:
    "You are focused on continuity, generosity, values transfer, and long-term stewardship impact.",
};

const pillarDetails: Record<
  AssessmentPillar,
  {
    line: string;
    accent: "gold" | "green" | "navy";
  }
> = {
  Protect: {
    line: "Protect what God has entrusted.",
    accent: "gold",
  },
  Grow: {
    line: "Grow your capacity to serve.",
    accent: "green",
  },
  Transfer: {
    line: "Transfer values and resources.",
    accent: "gold",
  },
  Impact: {
    line: "Impact Kingdom and community.",
    accent: "navy",
  },
};

const pillarOrder: AssessmentPillar[] = ["Protect", "Grow", "Transfer", "Impact"];

const profileSteps = [
  {
    label: "Assessment",
    status: "Complete",
    state: "complete",
  },
  {
    label: "Financial Analysis",
    status: "Next",
    state: "next",
  },
  {
    label: "Estate Review",
    status: "Locked",
    state: "locked",
  },
  {
    label: "Business Review",
    status: "Locked",
    state: "locked",
  },
  {
    label: "Giving Profile",
    status: "Locked",
    state: "locked",
  },
];

export default async function DashboardOverviewPage() {
  const dashboard = await getLatestDashboardSnapshot();

  if (!dashboard) {
    return (
      <main className="dashboard-page" aria-labelledby="overview-title">
        <section className="dashboard-snapshot-hero dashboard-empty-hero">
          <div>
            <p className="eyebrow">Your stewardship snapshot</p>
            <h1 id="overview-title">Create your first dashboard.</h1>
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
            <h2>Your stewardship picture starts here.</h2>
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
  const stage = scores.stage as StewardshipStage;
  const pillarEntries = pillarOrder.map(
    (pillar) => [pillar, scores.pillarScores[pillar] ?? 0] as const,
  );

  return (
    <main className="dashboard-page" aria-labelledby="overview-title">
      <section className="dashboard-snapshot-hero">
        <div className="dashboard-snapshot-copy">
          <p className="eyebrow">Your stewardship snapshot</p>
          <h1 id="overview-title">Your Stewardship Snapshot</h1>
          <p>
            Your initial diagnostic turns a few simple answers into a clearer
            view of what needs protection, what can grow, what should transfer,
            and what can create lasting impact.
          </p>
        </div>
        <div className="dashboard-snapshot-score">
          <div>
            <span>Stewardship Score</span>
            <strong>{scores.stewardshipScore}</strong>
            <p>{scores.confidenceLabels[0]}</p>
          </div>
          <div className="dashboard-stage-summary">
            <span>{stage} Stage</span>
            <p>{stageExplanations[stage]}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-pillar-row" aria-label="Stewardship pillars">
        {pillarEntries.map(([pillar, score]) => (
          <article
            className={`dashboard-pillar-primary dashboard-pillar-primary-${pillarDetails[pillar].accent}`}
            key={pillar}
          >
            <div>
              <span>{pillar}</span>
              <strong>{score}</strong>
            </div>
            <p>{pillarDetails[pillar].line}</p>
            <div className="meter-track" aria-hidden="true">
              <span style={{ width: `${score}%` }} />
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-v2-grid">
        <div className="dashboard-next-steps-card">
          <div>
            <p className="eyebrow">Next steps</p>
            <h2>What deserves attention now.</h2>
          </div>
          <ol className="dashboard-priority-list dashboard-priority-list-v2">
            {scores.topPriorities.map((priority) => (
              <li key={priority.title}>
                <div>
                  <strong>{priority.title}</strong>
                  <span>{priority.pillar}</span>
                </div>
                <p>{priority.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="dashboard-unlock-card">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">Unlock deeper clarity</p>
            <h2>Unlock Financial Analysis</h2>
          </div>
          <p>
            Add deeper financial context after the initial diagnostic, without
            turning the first assessment into a giant intake form.
          </p>
          <Link className="button button-primary" href="/dashboard/grow">
            Complete Financial Analysis
          </Link>
        </div>
      </section>

      <section
        className="dashboard-profile-card"
        aria-labelledby="profile-completion-title"
      >
        <div className="dashboard-profile-summary">
          <p className="eyebrow">Stewardship profile</p>
          <h2 id="profile-completion-title">Stewardship Profile Completion</h2>
          <p>
            Your profile builds progressively. The initial assessment is
            complete, and the next layer is Financial Analysis.
          </p>
        </div>
        <div className="dashboard-profile-meter">
          <strong>{dashboard.profileCompletion}%</strong>
          <div className="meter-track" aria-hidden="true">
            <span style={{ width: `${dashboard.profileCompletion}%` }} />
          </div>
        </div>
        <div className="dashboard-profile-steps">
          {profileSteps.map((step) => (
            <article data-state={step.state} key={step.label}>
              <span>{step.status}</span>
              <strong>{step.label}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel" aria-labelledby="locked-modules-title">
        <div className="dashboard-panel-heading">
          <p className="eyebrow">Future modules</p>
          <h2 id="locked-modules-title">More opens as your profile deepens.</h2>
        </div>
        <div className="locked-module-grid">
          {dashboard.lockedModules.map((module) => (
            <article className="locked-module-card" key={module}>
              <span>Future module</span>
              <strong>{module}</strong>
              <p>Unlocks after the next build phase.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
