export default function ReportsPage() {
  return (
    <main className="dashboard-page" aria-labelledby="reports-title">
      <p className="eyebrow">Reports</p>
      <h1 id="reports-title">Professional reports will generate here.</h1>
      <p>
        Reports are deliverables generated from dashboard data. PDF generation
        is intentionally not part of Sprint 1.
      </p>
      <section className="empty-state-card" aria-label="Reports placeholder">
        <h2>No reports yet.</h2>
        <p>Reports will unlock after future dashboard and analysis work.</p>
      </section>
    </main>
  );
}
