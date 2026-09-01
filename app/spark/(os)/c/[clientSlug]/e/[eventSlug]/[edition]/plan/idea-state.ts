/**
 * The four states an idea can be in, in the words the product uses.
 *
 * The stored vocabulary is older than the product's: an idea being
 * considered is 'captured', one the team is talking about is 'discussing',
 * one that reached the plan is 'approved', and one set aside is 'parked'.
 * Renaming the column would buy nothing and cost a migration, so the
 * translation lives here, in one place, shared by the server actions and the
 * board rather than copied into both.
 */

export const IDEA_STATES = ["considering", "discuss", "planned", "aside"] as const;

export type IdeaState = (typeof IDEA_STATES)[number];

export const IDEA_STATE_TO_STATUS: Record<IdeaState, string> = {
  considering: "captured",
  discuss: "discussing",
  planned: "approved",
  aside: "parked",
};

export const toIdeaState = (status: string): IdeaState =>
  status === "discussing" ? "discuss"
    : status === "approved" ? "planned"
    : status === "parked" || status === "declined" ? "aside"
    : "considering";
