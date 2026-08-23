import Link from "next/link";

import { sectionLabel, viewerLabel } from "../_lib/viewer";
import type { SectionKey, ViewerRole } from "../_lib/viewer";

/**
 * What a lens sees when it reaches a section that is not its own.
 *
 * A 404 would be a lie, and an error would read as a fault. This says the true
 * thing: the section exists, the planners work in it, and it is not part of
 * this view. That is the service showing its shape rather than hiding it.
 */
export function Restricted({
  role,
  section,
  home,
}: {
  role: ViewerRole;
  section: SectionKey;
  home: string;
}) {
  return (
    <main className="eo-page">
      <div className="eo-shell">
        <section className="sp-restricted">
          <p className="eo-eyebrow">Planner workspace</p>
          <h1>{sectionLabel(section)} sits with Brooke and Ryan.</h1>
          <p>
            This is part of how the weekend gets built rather than part of what
            you are asked to weigh in on. The decisions that come out of it
            reach you on the event home and in the weekly meeting.
          </p>
          <p className="eo-note">
            You are viewing as {viewerLabel[role]}.
          </p>
          <p style={{ marginTop: 18 }}>
            <Link className="eo-panel-link" href={home}>
              Back to the event home
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
