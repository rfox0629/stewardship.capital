export default function DashboardOverviewPage() {
  return (
    <main className="dashboard-page" aria-labelledby="overview-title">
      <p className="eyebrow">Overview</p>
      <h1 id="overview-title">Your stewardship dashboard shell.</h1>
      <p>
        This protected route placeholder will become the dashboard overview
        after authentication, assessment, and scoring are connected.
      </p>
      <section className="empty-state-card" aria-label="Overview placeholder">
        <h2>Overview is empty for Sprint 1.</h2>
        <p>
          Future work will add Stewardship Score, stage, profile completion,
          top priorities, and the next recommended step.
        </p>
      </section>
    </main>
  );
}
