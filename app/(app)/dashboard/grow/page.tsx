const analysisOptions = [
  {
    title: "Connect Accounts",
    status: "Coming Soon",
    copy: "Future account connections may help organize balances and activity after the security and data model are ready.",
  },
  {
    title: "Upload Documents",
    status: "Coming Soon",
    copy: "Future document uploads may support deeper review after storage, redaction, and extraction workflows are designed.",
  },
  {
    title: "Enter Manually",
    status: "Placeholder",
    copy: "Manual entry will become the first lightweight path for adding financial context without forcing a giant intake form.",
  },
];

export default function GrowPage() {
  return (
    <main className="dashboard-page" aria-labelledby="grow-title">
      <p className="eyebrow">Financial Analysis</p>
      <h1 id="grow-title">Complete Financial Analysis.</h1>
      <p>
        This placeholder will become the progressive onboarding path for deeper
        financial clarity after the initial stewardship dashboard is created.
      </p>

      <section className="analysis-intro-card">
        <div>
          <p className="eyebrow">Grow your capacity to serve</p>
          <h2>Start with the least-friction path.</h2>
          <p>
            Financial data collection is intentionally separate from the first
            assessment. This screen previews the future options without
            connecting accounts, accepting uploads, or extracting documents.
          </p>
        </div>
      </section>

      <section
        className="analysis-option-grid"
        aria-label="Financial Analysis options"
      >
        {analysisOptions.map((option) => (
          <article className="analysis-option-card" key={option.title}>
            <div className="analysis-option-heading">
              <span>{option.status}</span>
              <h2>{option.title}</h2>
            </div>
            <p>{option.copy}</p>
            <button
              className="button button-secondary"
              disabled
              type="button"
            >
              {option.status === "Placeholder"
                ? "Manual Entry Placeholder"
                : "Coming Soon"}
            </button>
          </article>
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <p className="eyebrow">Not built yet</p>
          <h2>Opportunity discovery comes later.</h2>
        </div>
        <p>
          Plaid, uploads, document extraction, opportunity scoring, and
          professional reports remain intentionally locked until the supporting
          architecture is ready.
        </p>
      </section>
    </main>
  );
}
