/**
 * Who is looking.
 *
 * Spark is an expert led service supported by a proprietary operating system,
 * not self service event planning software. That distinction has to be
 * structural rather than a line of marketing copy, so access is a first class
 * concept in the product rather than a permission bolted on later.
 *
 *   planner      Brooke and Ryan. The whole engine.
 *   client       Shine leadership. Submit, review, decide, approve, see what is settled.
 *   stakeholder  Guests and speakers. What concerns them, and nothing else.
 *
 * The governing rule, taken straight from founder direction: a client can
 * discuss and approve, but changes stay proposed until a planner confirms them.
 * No view other than planner can move something from proposed to confirmed.
 */
export type ViewerRole = "planner" | "client" | "stakeholder";

export const VIEWER_COOKIE = "spark_viewer";

export const VIEWER_ROLES: ViewerRole[] = ["planner", "client", "stakeholder"];

export const isViewerRole = (value: string | undefined): value is ViewerRole =>
  value === "planner" || value === "client" || value === "stakeholder";

/** Short label for the lens control in Spark's chrome. */
export const viewerLabel: Record<ViewerRole, string> = {
  planner: "Planner",
  client: "Client team",
  stakeholder: "Guest",
};

/** Who each lens belongs to, said plainly. Used in the preview banner. */
export const viewerWho: Record<ViewerRole, string> = {
  planner: "Brooke and Ryan. Full pipeline, internal notes, and final control.",
  client: "Client leadership. Submit sparks, weigh in, approve, see what is settled.",
  stakeholder: "Guests and speakers. Confirmed schedule, travel, and communications.",
};

/* --------------------------------------------------------------- sections */

/**
 * One place that says what each lens can reach. Nav, route guards, and the
 * event home all read this, so a section can never appear in navigation that
 * the same viewer is refused at the route.
 */
export type SectionKey =
  | ""
  | "sparks"
  | "meeting"
  | "plan"
  | "schedule"
  | "budget"
  | "tasks"
  | "run-of-show"
  | "resources"
  | "review";

type Section = {
  key: SectionKey;
  /** Planner wording. */
  label: string;
  /** Wording when a client or guest is looking, where it differs. */
  guestLabel?: string;
  roles: ViewerRole[];
};

const SECTIONS: Section[] = [
  { key: "", label: "Event home", roles: ["planner", "client", "stakeholder"] },
  { key: "sparks", label: "Sparks", roles: ["planner", "client"] },
  { key: "meeting", label: "This week", roles: ["planner", "client"] },
  { key: "plan", label: "Event plan", roles: ["planner"] },
  {
    key: "schedule",
    label: "Schedule",
    guestLabel: "Confirmed schedule",
    roles: ["planner", "client", "stakeholder"],
  },
  { key: "budget", label: "Budget", roles: ["planner", "client"] },
  { key: "tasks", label: "Tasks", roles: ["planner"] },
  { key: "run-of-show", label: "Run of show", roles: ["planner"] },
  { key: "resources", label: "Resources", roles: ["planner", "client"] },
  { key: "review", label: "Impact review", roles: ["planner", "client"] },
];

export const sectionsFor = (role: ViewerRole) =>
  SECTIONS.filter((section) => section.roles.includes(role)).map((section) => ({
    key: section.key,
    label: role === "planner" ? section.label : section.guestLabel ?? section.label,
  }));

export const canView = (role: ViewerRole, key: SectionKey) =>
  SECTIONS.find((section) => section.key === key)?.roles.includes(role) ?? false;

export const sectionLabel = (key: SectionKey) =>
  SECTIONS.find((section) => section.key === key)?.label ?? "This section";

/* ----------------------------------------------------------------- detail */

/**
 * Whether the internal reasoning behind a decision is visible. Founder
 * direction: the technology should make the planners' expertise more visible,
 * not publish the whole methodology by default.
 */
export const seesInternalDetail = (role: ViewerRole) => role === "planner";

/** Whether this lens can move something from proposed to confirmed. */
export const canConfirm = (role: ViewerRole) => role === "planner";

/**
 * Which spark states a lens is entitled to see.
 *
 * Parked and declined are where the planners' working reasoning lives. A
 * client hears what was decided in the weekly meeting, from a person, rather
 * than by reading the rejection pile.
 *
 * This has to be applied on the server. The sparks board is a client
 * component, so anything handed to it as a prop is serialized into the page
 * whether or not it is rendered, and filtering at render time would leak every
 * declined idea into the browser.
 */
export const sparkVisibleTo = (role: ViewerRole, status: string) =>
  role === "planner" ||
  status === "captured" ||
  status === "discussing" ||
  status === "approved";
