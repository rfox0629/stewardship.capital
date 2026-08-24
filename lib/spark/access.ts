import type { SparkAccess, SparkWorkspace } from "./types.ts";
import { isSparkRole } from "./types.ts";

/**
 * What this identity may currently reach.
 *
 * Asked of the database on every protected request. That is the point: a
 * membership answered from a token would keep answering after the membership
 * was taken away, so nothing about engagement access is ever carried in the
 * identity token or cached across requests.
 *
 * One round trip. Reaching my_access() at all proves the access token was
 * signed and unexpired, because PostgREST verifies it before the function
 * runs, so the identity it returns is verified rather than claimed.
 */

type Rpc = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

const toWorkspace = (row: unknown): SparkWorkspace | null => {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;

  const engagementId = value.engagement_id;
  const role = value.role;
  const clientSlug = value.client_slug;
  const eventSlug = value.event_slug;
  const editionSlug = value.edition_slug;

  if (
    typeof engagementId !== "string" ||
    !isSparkRole(role) ||
    typeof clientSlug !== "string" ||
    typeof eventSlug !== "string" ||
    typeof editionSlug !== "string"
  ) {
    return null;
  }

  return {
    engagementId,
    role,
    clientSlug,
    eventSlug,
    editionSlug,
    clientName: typeof value.client_name === "string" ? value.client_name : clientSlug,
    engagementName:
      typeof value.engagement_name === "string" ? value.engagement_name : editionSlug,
  };
};

/** Shapes the database answer, and refuses anything that does not fit. */
export const readAccess = (data: unknown): SparkAccess | null => {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;

  if (typeof value.user_id !== "string" || typeof value.email !== "string") {
    return null;
  }

  const rows = Array.isArray(value.workspaces) ? value.workspaces : [];

  return {
    userId: value.user_id,
    email: value.email,
    staff: value.staff === true,
    workspaces: rows.flatMap((row) => {
      const workspace = toWorkspace(row);
      return workspace ? [workspace] : [];
    }),
  };
};

/**
 * No session, an expired session, a revoked refresh token, a forged cookie,
 * and an unreachable database all answer the same way: no access. A guard that
 * throws on a malformed cookie is a guard that can be made to fail open.
 */
export const resolveAccess = async (
  supabase: Rpc,
): Promise<SparkAccess | null> => {
  try {
    const { data, error } = await supabase.rpc("my_access");
    if (error) return null;
    return readAccess(data);
  } catch {
    return null;
  }
};

export const workspaceById = (
  access: SparkAccess | null,
  engagementId: string,
): SparkWorkspace | undefined =>
  access?.workspaces.find((workspace) => workspace.engagementId === engagementId);

/** Only ever this person's own workspaces. Spark never lists the platform. */
export type Choice = {
  engagementId: string;
  clientName: string;
  engagementName: string;
};

export const choicesFrom = (access: SparkAccess): Choice[] =>
  access.workspaces.map((workspace) => ({
    engagementId: workspace.engagementId,
    clientName: workspace.clientName,
    engagementName: workspace.engagementName,
  }));
