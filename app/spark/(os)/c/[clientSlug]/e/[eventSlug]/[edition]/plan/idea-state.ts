/**
 * What an idea is, in the product's words.
 *
 * There are two states and no workflow. An idea is open, or it has been set
 * aside. Everything else a person might want to know about it, whether it
 * carries a question and whether anything has come of it, is read from the
 * idea's own facts rather than from a lane it was dragged into.
 *
 * The stored column still says 'captured' and 'parked'. Renaming it would
 * cost a migration and buy nothing, so the translation lives here.
 */

export type IdeaState = "open" | "aside";

export const toIdeaState = (status: string): IdeaState =>
  status === "parked" || status === "declined" ? "aside" : "open";

export const IDEA_STATE_TO_STATUS: Record<IdeaState, string> = {
  open: "captured",
  aside: "parked",
};

/** The lenses over one collection. Filters, never columns. */
export const IDEA_FILTERS = ["all", "question", "planned", "aside"] as const;
export type IdeaFilter = (typeof IDEA_FILTERS)[number];

export const FILTER_LABEL: Record<IdeaFilter, string> = {
  all: "All",
  question: "Needs answer",
  planned: "In plan",
  aside: "Set aside",
};
