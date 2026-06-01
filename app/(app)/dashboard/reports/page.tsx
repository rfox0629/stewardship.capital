export default function ReportsPage() {
  return (
    <main className="dashboard-page" aria-labelledby="reports-title">
      <p className="eyebrow">Reports</p>
      <h1 id="reports-title">Professional reports will generate here.</h1>
      <p>
        Reports are deliverables generated from dashboard data. PDF generation
        is intentionally not built yet.
      </p>
      <section className="empty-state-card" aria-label="Reports placeholder">
        <p className="eyebrow">Coming soon</p>
        <h2>Reports are coming soon.</h2>
        <p>
          Reports will unlock after future dashboard, Financial Analysis, and
          report-generation work.
        </p>
      </section>
    </main>
  );
}
