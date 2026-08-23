import { viewerWho } from "../_lib/viewer";
import type { ViewerRole } from "../_lib/viewer";
import { ViewerSwitch } from "./viewer-switch";

/**
 * The preview strip.
 *
 * The lens control lives here rather than in Spark's top bar on purpose. In
 * the shipped product there is no control, because who you are is decided at
 * sign in. Keeping it out of the chrome means the bar in this preview is the
 * bar that ships, and the one thing that does not ship sits in a strip that
 * says so.
 */
export function LensStrip({ viewer }: { viewer: ViewerRole }) {
  return (
    <div className="sp-lens-note">
      <div className="eo-shell">
        <ViewerSwitch current={viewer} />
        <p>{viewerWho[viewer]}</p>
      </div>
    </div>
  );
}
