import Link from "next/link";

import { viewerLabel } from "../_lib/viewer";
import type { ViewerRole } from "../_lib/viewer";

/**
 * The platform index and the client index are planner surfaces.
 *
 * A client team belongs to one event and a guest belongs to one weekend.
 * Neither has any business seeing a list of other people's gatherings, so the
 * cross client surfaces are not gated by a permission check on the data, they
 * simply are not part of those lenses at all.
 */
export function PlannerOnly({
  role,
  backHref,
  backLabel,
}: {
  role: ViewerRole;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="eo-page">
      <div className="eo-shell">
        <section className="sp-restricted">
          <p className="eo-eyebrow">Planner workspace</p>
          <h1>This is where Brooke and Ryan work across every event.</h1>
          <p>
            You belong to one gathering, not to the platform, so this surface is
            not part of your view. Switch the lens above back to Planner to see
            it.
          </p>
          <p className="eo-note">You are viewing as {viewerLabel[role]}.</p>
          {backHref ? (
            <p style={{ marginTop: 18 }}>
              <Link className="eo-panel-link" href={backHref}>
                {backLabel ?? "Back"}
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
