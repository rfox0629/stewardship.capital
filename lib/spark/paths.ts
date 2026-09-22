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

/**
 * Every client on the platform. Explicit platform staff only.
 *
 * This is Stewardship.Capital's own surface rather than Spark's, so it lives
 * at the top level. Spark is one product on it.
 */
export const PLATFORM_HOME = "/platform";

/** Where the platform home used to be. Redirected to PLATFORM_HOME. */
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

const WORKSPACE_ROOT = new RegExp(`^${SPARK_BASE}/c/([^/]+)/e/([^/]+)/([^/]+)/?$`);

/**
 * The engagement a path names when it is exactly a workspace's root, which is
 * where its weekend guide lives. Anything deeper, including /team, is not.
 */
export const workspaceRootOf = (pathname: string): WorkspaceRef | null => {
  const match = pathname.match(WORKSPACE_ROOT);
  if (!match) return null;
  return { clientSlug: match[1], eventSlug: match[2], editionSlug: match[3] };
};

/* ------------------------------------------------------------ short paths */

/**
 * Short addresses for a guide, because these two go on printed things.
 *
 * `/shine/2026` is readable over a shoulder and survives being typed from a
 * card; the workspace path it stands for is not. Only the guest guide and the
 * team guide get one. The planner surfaces keep the long address, so nothing
 * is published at the top level by accident, and a short path can never be
 * widened into the calendar or the budget by adding a segment.
 *
 * The map is the whole feature: a guide either has a short address here or it
 * does not, and every other part of the system keeps working in workspace
 * paths as before.
 */
const SHORT_GUIDES: Array<{ short: string; workspace: WorkspaceRef }> = [
  {
    short: "/shine/2026",
    workspace: { clientSlug: "shine", eventSlug: "founders-weekend", editionSlug: "2026" },
  },
];

/** The only sections a short address reaches: the guide, and the team's. */
const SHORT_SECTIONS = ["", "/team"] as const;

const trimSlash = (pathname: string) =>
  pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

/** The workspace path a short address stands for, if it is one. */
export const canonicalGuidePath = (pathname: string): string | null => {
  const path = trimSlash(pathname);
  for (const guide of SHORT_GUIDES) {
    for (const section of SHORT_SECTIONS) {
      if (path === `${guide.short}${section}`) {
        return `${workspacePath(guide.workspace)}${section}`;
      }
    }
  }
  return null;
};

/** The short address for a workspace path, if it has one. */
export const shortGuidePath = (pathname: string): string | null => {
  const path = trimSlash(pathname);
  for (const guide of SHORT_GUIDES) {
    const base = workspacePath(guide.workspace);
    for (const section of SHORT_SECTIONS) {
      if (path === `${base}${section}`) return `${guide.short}${section}`;
    }
  }
  return null;
};

/**
 * Where to send someone, preferring the short address.
 *
 * Every redirect and every link in the product goes through here, so nobody
 * is ever handed the old address, not even for the moment before a redirect.
 */
export const preferShortPath = (pathname: string): string =>
  shortGuidePath(pathname) ?? pathname;
