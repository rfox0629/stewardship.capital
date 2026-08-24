import {
  SPARK_BASE,
  SPARK_ENTRY,
  SPARK_PLATFORM,
  clientSlugOf,
  isOpenSparkPath,
  isSparkPath,
  pathBelongsToWorkspace,
  sectionOf,
  workspacePath,
} from "./paths.ts";
import type { SparkAccess, SparkRole, SparkWorkspace } from "./types.ts";

/**
 * Request level authorization, as a pure decision.
 *
 * Kept free of Next and Supabase imports so the guard and the tests exercise
 * exactly the same logic, rather than the tests exercising a copy of it.
 *
 * This runs in addition to row level security, not instead of it. RLS protects
 * the data; this protects the route, which matters because a route can render
 * before it ever asks the database for anything.
 *
 * The access it is handed must have been resolved from the database on this
 * request. That is what makes revocation take effect immediately.
 */

export type AuthorizationDecision =
  | { allow: true }
  | { allow: false; redirectTo: string };

export { isSparkPath };

const ALLOW: AuthorizationDecision = { allow: true };

const WORKING: SparkRole[] = ["planner", "client"];
const EVERYONE: SparkRole[] = ["planner", "client", "stakeholder"];
const PLANNER_ONLY: SparkRole[] = ["planner"];

/**
 * Which roles may reach which part of a workspace.
 *
 * Deliberately the same three lines the database draws. Row level security
 * already refuses a stakeholder the budget and refuses a client the run of
 * show, but a screen can render before it asks the database anything, so the
 * route has to know the same rules rather than trusting the query underneath
 * it to be the only way in.
 *
 * An unrecognised section is planner only. A section added later is then
 * private by default rather than public by accident.
 */
const SECTIONS: Record<string, SparkRole[]> = {
  /* The overview carries budget and spark counts, so it is working members. A
     stakeholder's home is the schedule instead, see workspaceHome. */
  "": WORKING,
  schedule: EVERYONE,
  sparks: WORKING,
  budget: WORKING,
  tasks: WORKING,
  resources: WORKING,
  decisions: WORKING,
  "run-of-show": PLANNER_ONLY,
};

const allowedRoles = (section: string): SparkRole[] =>
  SECTIONS[section] ?? PLANNER_ONLY;

/**
 * Where a person's own workspace starts, for them.
 *
 * Guests and speakers begin at the schedule, because the overview is not
 * theirs to see and landing somewhere you are refused is indistinguishable
 * from being locked out.
 */
export const workspaceHome = (workspace: SparkWorkspace): string =>
  workspace.role === "stakeholder"
    ? `${workspacePath(workspace)}/schedule`
    : workspacePath(workspace);

/* Every refusal lands on the front door, which then routes the person to
   wherever they do belong. One destination means a refusal never becomes a
   redirect loop, and never hints at what else exists. */
const REFUSE: AuthorizationDecision = { allow: false, redirectTo: SPARK_ENTRY };

export const authorizeSparkPath = (
  pathname: string,
  access: SparkAccess | null,
): AuthorizationDecision => {
  if (!isSparkPath(pathname)) return ALLOW;

  /* The front door and invitation links are reachable without a session. They
     have to be: one is where refusals land, the other is how a person who has
     no account yet gets one. */
  if (isOpenSparkPath(pathname)) return ALLOW;

  if (!access) return REFUSE;

  /* Platform staff is the only grant that crosses clients, so the home that
     lists every client is the one surface that asks for it by name. */
  if (pathname === SPARK_PLATFORM || pathname.startsWith(`${SPARK_PLATFORM}/`)) {
    return access.staff ? ALLOW : REFUSE;
  }

  if (access.staff) return ALLOW;

  const client = clientSlugOf(pathname);
  if (!client) return REFUSE;

  /* A client's own index lists that client's engagements with their budget
     rollups, so it is a working surface: the same line the workspace overview
     draws. A stakeholder who belongs to one of the client's engagements is
     sent to their own home in it, not out of Spark; anyone else is refused. */
  if (pathname === `${SPARK_BASE}/c/${client}`) {
    const mine = access.workspaces.filter(
      (workspace) => workspace.clientSlug === client,
    );
    if (mine.some((workspace) => WORKING.includes(workspace.role))) return ALLOW;
    if (mine.length > 0) {
      return { allow: false, redirectTo: workspaceHome(mine[0]) };
    }
    return REFUSE;
  }

  /* Client separation has to hold at the route, not only in navigation, so
     this asks whether the path is inside a workspace the person is currently a
     member of rather than trusting the link they followed. */
  const workspace = access.workspaces.find((candidate) =>
    pathBelongsToWorkspace(pathname, candidate),
  );
  if (!workspace) return REFUSE;

  const section = sectionOf(pathname, workspace);
  if (section === null) return REFUSE;

  if (!allowedRoles(section).includes(workspace.role)) {
    /* Inside their own workspace, just not this part of it. Sending them to
       their own home rather than to the front door keeps a wrong link from
       looking like being signed out. */
    return { allow: false, redirectTo: workspaceHome(workspace) };
  }

  return ALLOW;
};

/**
 * Where a verified identity belongs when they arrive with no destination.
 *
 * One engagement goes straight in, which is the common case and should not
 * cost a click. Several offers only that person's own. None is a quiet
 * refusal: Spark does not explain who else exists.
 */
export type Landing =
  | { kind: "platform"; href: string }
  | { kind: "workspace"; href: string }
  | { kind: "choose" }
  | { kind: "refused" };

export const landingFor = (access: SparkAccess | null): Landing => {
  if (!access) return { kind: "refused" };
  if (access.staff) return { kind: "platform", href: SPARK_PLATFORM };
  if (access.workspaces.length === 1) {
    return { kind: "workspace", href: workspaceHome(access.workspaces[0]) };
  }
  if (access.workspaces.length > 1) return { kind: "choose" };
  return { kind: "refused" };
};
