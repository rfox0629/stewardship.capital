import {
  SPARK_BASE,
  pathBelongsToWorkspace,
  workspaceById,
  workspacePath,
} from "./directory.ts";
import type { SparkRole } from "./types.ts";

/**
 * Request level authorization, as a pure decision.
 *
 * Kept free of Next imports so the guard and the tests exercise exactly the
 * same logic rather than the tests exercising a copy of it.
 */

export type AuthorizedSubject = {
  email: string;
  workspaceId: string;
  role: SparkRole;
};

export type AuthorizationDecision =
  | { allow: true }
  | { allow: false; redirectTo: string };

export const isSparkPath = (pathname: string) =>
  pathname === SPARK_BASE || pathname.startsWith(`${SPARK_BASE}/`);

export const authorizeSparkPath = (
  pathname: string,
  session: AuthorizedSubject | null,
): AuthorizationDecision => {
  if (!session) return { allow: false, redirectTo: "/more" };

  const workspace = workspaceById(session.workspaceId);
  if (!workspace) return { allow: false, redirectTo: "/more" };

  const home = workspacePath(workspace);

  /* The planner home lists every client on the platform, so it is the one
     surface a client must never reach. */
  if (pathname === SPARK_BASE || pathname === `${SPARK_BASE}/`) {
    return session.role === "planner"
      ? { allow: true }
      : { allow: false, redirectTo: home };
  }

  if (session.role === "planner") return { allow: true };

  return pathBelongsToWorkspace(pathname, workspace)
    ? { allow: true }
    : { allow: false, redirectTo: home };
};
