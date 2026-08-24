import {
  SPARK_BASE,
  SPARK_ENTRY,
  SPARK_PLATFORM,
  clientSlugOf,
  isOpenSparkPath,
  isSparkPath,
  pathBelongsToWorkspace,
} from "./paths.ts";
import type { SparkAccess } from "./types.ts";

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

  /* A client's own index lists that client's engagements. Belonging to any one
     of them is enough to see it; belonging to none of them is not. */
  if (pathname === `${SPARK_BASE}/c/${client}`) {
    return access.workspaces.some((workspace) => workspace.clientSlug === client)
      ? ALLOW
      : REFUSE;
  }

  /* Client separation has to hold at the route, not only in navigation, so
     this asks whether the path is inside a workspace the person is currently a
     member of rather than trusting the link they followed. */
  return access.workspaces.some((workspace) =>
    pathBelongsToWorkspace(pathname, workspace),
  )
    ? ALLOW
    : REFUSE;
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
    const [only] = access.workspaces;
    return {
      kind: "workspace",
      href: `${SPARK_BASE}/c/${only.clientSlug}/e/${only.eventSlug}/${only.editionSlug}`,
    };
  }
  if (access.workspaces.length > 1) return { kind: "choose" };
  return { kind: "refused" };
};
