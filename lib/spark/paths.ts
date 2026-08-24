/**
 * Where Spark lives.
 *
 * Spark is a product, so it gets a permanent namespace rather than a route
 * named after the thing it happened to be called first. Everything under
 * /spark belongs to it: the front door, invitations, workspaces, and the
 * platform home.
 *
 * To move Spark to its own origin one day, change SPARK_BASE and nothing else
 * here moves.
 */
export const SPARK_BASE = "/spark";

/** The front door. Never guarded: it is what a refusal redirects to. */
export const SPARK_ENTRY = SPARK_BASE;

/** Every client on the platform. Explicit platform staff only. */
export const SPARK_PLATFORM = `${SPARK_BASE}/platform`;

export const INVITE_PREFIX = `${SPARK_BASE}/i`;
export const AUTH_PREFIX = `${SPARK_BASE}/auth`;
export const SIGNOUT_PATH = `${SPARK_BASE}/signout`;

/** One engagement, addressed the way a person would describe it. */
export type WorkspaceRef = {
  clientSlug: string;
  eventSlug: string;
  editionSlug: string;
};

export const workspacePath = (workspace: WorkspaceRef) =>
  `${SPARK_BASE}/c/${workspace.clientSlug}/e/${workspace.eventSlug}/${workspace.editionSlug}`;

export const clientPath = (clientSlug: string) => `${SPARK_BASE}/c/${clientSlug}`;

/**
 * The section of a workspace a path is asking for, or "" for the overview.
 *
 * Returns null when the path is not inside this workspace at all, so the
 * caller cannot mistake "not yours" for "the overview".
 */
export const sectionOf = (
  pathname: string,
  workspace: WorkspaceRef,
): string | null => {
  const prefix = workspacePath(workspace);
  if (pathname === prefix) return "";
  if (!pathname.startsWith(`${prefix}/`)) return null;
  return pathname.slice(prefix.length + 1).split("/")[0];
};

const within = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isSparkPath = (pathname: string) => within(pathname, SPARK_BASE);

/**
 * The surfaces inside Spark that are deliberately reachable without a session.
 *
 * The front door has to be, or a refusal would redirect into itself.
 * Invitation links and the emailed link callback have to be, because the
 * person following them is in the middle of proving who they are and does not
 * have a session yet. Signing out has to be, so that leaving always works even
 * when access has already been withdrawn.
 *
 * None of them show anything. They are the doors, not the rooms.
 */
export const isOpenSparkPath = (pathname: string) =>
  pathname === SPARK_BASE ||
  pathname === `${SPARK_BASE}/` ||
  pathname === SIGNOUT_PATH ||
  within(pathname, INVITE_PREFIX) ||
  within(pathname, AUTH_PREFIX);

export const pathBelongsToWorkspace = (
  pathname: string,
  workspace: WorkspaceRef,
): boolean => within(pathname, workspacePath(workspace));

const CLIENT_SEGMENT = new RegExp(`^${SPARK_BASE}/c/([^/]+)`);

/** The client segment of a Spark path, when it has one. */
export const clientSlugOf = (pathname: string): string | null =>
  pathname.match(CLIENT_SEGMENT)?.[1] ?? null;
