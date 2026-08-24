/**
 * Who someone is to Spark.
 *
 * The role vocabulary is deliberately identical to the lens model inside the
 * operating system, so membership resolved here can drive what a person sees
 * once they are in a workspace rather than being a second, competing idea.
 *
 *   planner      the Spark team. The whole engine.
 *   client       client leadership. Submit, discuss, approve, see what is settled.
 *   stakeholder  guests and speakers. What concerns them, and nothing else.
 */
export type SparkRole = "planner" | "client" | "stakeholder";

/** One client event. Never enumerated to anyone who is not a member. */
export type Workspace = {
  id: string;
  client: string;
  label: string;
  clientSlug: string;
  eventSlug: string;
  editionSlug: string;
};

export type Membership = {
  workspaceId: string;
  role: SparkRole;
};

export type SparkSession = {
  email: string;
  workspaceId: string;
  role: SparkRole;
  /** Expiry, epoch seconds. */
  exp: number;
};

/** What the browser is allowed to learn. Only ever about the address typed. */
export type AccessResult =
  | { status: "unauthorized" }
  | {
      status: "choose";
      workspaces: Array<{ id: string; client: string; label: string }>;
    };
