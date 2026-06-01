import Link from "next/link";

import { AssessmentFlow } from "./assessment-flow";

export default function AssessmentPage() {
  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <Link className="brand" href="/" aria-label="Stewardship Capital home">
          <span className="brand-monogram" aria-hidden="true">
            SC
          </span>
          <span>Stewardship Capital</span>
        </Link>
        <p>Fast diagnostic. No dollar amounts.</p>
      </header>

      <AssessmentFlow />
    </main>
  );
}
