import Link from "next/link";

import { getInitialAssessmentDraft } from "../../lib/assessment/assessment-repository";
import { AssessmentFlow } from "./assessment-flow";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const initialDraft = await getInitialAssessmentDraft();

  return (
    <main className="assessment-page">
      <header className="assessment-header" aria-label="Assessment context">
        <Link className="assessment-header-link" href="/" aria-label="Stewardship Capital home">
          <span className="brand-monogram" aria-hidden="true">
            SC
          </span>
          <span>Stewardship Assessment</span>
        </Link>
        <p>Fast diagnostic. No dollar amounts.</p>
      </header>

      <AssessmentFlow initialDraft={initialDraft} />
    </main>
  );
}
