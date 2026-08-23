import { setViewer } from "../_lib/viewer-server";
import { VIEWER_ROLES, viewerLabel } from "../_lib/viewer";
import type { ViewerRole } from "../_lib/viewer";

/**
 * The lens control.
 *
 * In the shipped product this is not a control at all. Who you are is decided
 * at sign in and you never see the other lenses. It exists here because the
 * founder review has to be able to walk the same event as a planner, as Shine
 * leadership, and as a guest, and reading three descriptions of an access
 * model is not the same as looking through it.
 *
 * A form and a server action rather than a client component, so the lens is
 * resolved on the server before anything renders and no screen ever flashes
 * content the current lens is not entitled to.
 */
export function ViewerSwitch({ current }: { current: ViewerRole }) {
  return (
    <div className="sp-lens">
      <span className="sp-lens-label">Viewing as</span>
      <form
        className="sp-lens-set"
        role="group"
        aria-label="Preview this event as"
        action={async (formData: FormData) => {
          "use server";
          await setViewer(formData.get("role") as ViewerRole);
        }}
      >
        {VIEWER_ROLES.map((role) => (
          <button
            key={role}
            type="submit"
            name="role"
            value={role}
            data-active={role === current ? "true" : undefined}
            aria-pressed={role === current}
          >
            {viewerLabel[role]}
          </button>
        ))}
      </form>
    </div>
  );
}
