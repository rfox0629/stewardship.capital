import { BrandMark } from "../brand-mark";
import { getInitialAssessmentDraft } from "../../lib/assessment/assessment-repository";
import { AssessmentFlow } from "./assessment-flow";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const initialDraft = await getInitialAssessmentDraft();

  return (
    <main className="assessment-page">
      <header className="assessment-header" aria-label="Assessment context">
        <BrandMark className="assessment-header-link" href="/" />
        <p>Fast diagnostic. No dollar amounts, uploads, or account connections.</p>
      </header>

      <AssessmentFlow initialDraft={initialDraft} />
    </main>
  );
}
