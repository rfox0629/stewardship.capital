import type { Membership, SparkRole, Workspace } from "./types.ts";

/**
 * The invitation directory.
 *
 * Server side only. This module must never be imported from a client
 * component: it is the list of who has access, and shipping it to the browser
 * would defeat the point. It is reached only through the server actions in
 * app/(www)/more/actions.ts and the route guard.
 *
 * Seeded for the preview. In the shipped product this is a table, and the
 * lookups below become queries. The shape is the contract.
 */

const WORKSPACES: Workspace[] = [
  {
    id: "shine-founders-weekend-2026",
    client: "SHINE",
    label: "Founders Weekend 2026",
    clientSlug: "shine",
    eventSlug: "founders-weekend",
    editionSlug: "2026",
  },
  {
    id: "redeemer-leaders-retreat-2027",
    client: "Redeemer Collective",
    label: "Leaders Retreat 2027",
    clientSlug: "redeemer-collective",
    eventSlug: "leaders-retreat",
    editionSlug: "2027",
  },
];

/** People who already belong to a workspace. */
const MEMBERSHIPS: Record<string, Membership[]> = {
  "ryan@stewardship.capital": [
    { workspaceId: "shine-founders-weekend-2026", role: "planner" },
    { workspaceId: "redeemer-leaders-retreat-2027", role: "planner" },
  ],
  "brooke@stewardship.capital": [
    { workspaceId: "shine-founders-weekend-2026", role: "planner" },
  ],
  "megan@shine.co": [
    { workspaceId: "shine-founders-weekend-2026", role: "client" },
  ],
  "guest@shine.co": [
    { workspaceId: "shine-founders-weekend-2026", role: "stakeholder" },
  ],
  "lena@redeemercollective.org": [
    { workspaceId: "redeemer-leaders-retreat-2027", role: "planner" },
  ],
};


const normalise = (email: string) => email.trim().toLowerCase();

export const workspaceById = (id: string): Workspace | undefined =>
  WORKSPACES.find((workspace) => workspace.id === id);

/**
 * Everything this address already belongs to. An empty list means no standing
 * access; an invitation is a separate, signed grant.
 */
export const membershipsFor = (email: string): Membership[] =>
  MEMBERSHIPS[normalise(email)] ?? [];


export const roleFor = (
  email: string,
  workspaceId: string,
): SparkRole | undefined =>
  membershipsFor(email).find(
    (membership) => membership.workspaceId === workspaceId,
  )?.role;

/**
 * Where Spark is mounted. The one place the public site knows this, so the
 * operating system stays free to move to its own domain: change this to the
 * new origin and nothing else here moves.
 */
export const SPARK_BASE = "/events-os";

export const workspacePath = (workspace: Workspace) =>
  `${SPARK_BASE}/c/${workspace.clientSlug}/e/${workspace.eventSlug}/${workspace.editionSlug}`;

/**
 * Whether a path inside Spark belongs to the workspace someone signed in to.
 *
 * Client separation has to hold at the route, not only in navigation, so this
 * is what the guard asks rather than trusting the link a person followed.
 */
export const pathBelongsToWorkspace = (
  pathname: string,
  workspace: Workspace,
): boolean => {
  const prefix = `${SPARK_BASE}/c/${workspace.clientSlug}/e/${workspace.eventSlug}/${workspace.editionSlug}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};
