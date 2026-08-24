/**
 * Who someone is to Spark.
 *
 * The role vocabulary is deliberately identical to the lens model inside the
 * operating system, so membership resolved here drives what a person sees once
 * they are in a workspace rather than being a second, competing idea.
 *
 *   planner      the Spark team running this engagement. The whole engine.
 *   client       client leadership. Submit, discuss, approve, see what is settled.
 *   stakeholder  guests and speakers. What concerns them, and nothing else.
 *
 * A planner is a planner of one engagement. Reaching across engagements is a
 * separate, explicit grant recorded in platform_staff, never something a role
 * quietly implies.
 */
export type SparkRole = "planner" | "client" | "stakeholder";

export const SPARK_ROLES: SparkRole[] = ["planner", "client", "stakeholder"];

export const isSparkRole = (value: unknown): value is SparkRole =>
  typeof value === "string" && (SPARK_ROLES as string[]).includes(value);

/**
 * One engagement this person belongs to, addressed the way the route is.
 *
 * Resolved from the database on the request that uses it. Never cached into a
 * token, because a permission baked into a token outlives its revocation.
 */
export type SparkWorkspace = {
  engagementId: string;
  role: SparkRole;
  clientSlug: string;
  clientName: string;
  eventSlug: string;
  editionSlug: string;
  engagementName: string;
};

/** What one verified identity may currently reach. */
export type SparkAccess = {
  userId: string;
  email: string;
  /** Explicit cross engagement grant. The platform home, and nothing less. */
  staff: boolean;
  workspaces: SparkWorkspace[];
};
