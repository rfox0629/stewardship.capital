/**
 * Spark domain model.
 *
 * Nothing in this file knows about Stewardship Capital, stewardship.capital,
 * Supabase, or the financial stewardship dashboard. The whole `app/spark`
 * folder is designed to lift into its own repository and domain by changing
 * EVENTS_OS_BASE in ./paths.ts. See docs/stewardship-events-architecture-v1.md.
 */

export type Id = string;

/** Platform -> Client -> Event -> Edition */

export type ClientTheme = {
  /** Client brand accent, applied through CSS custom properties. */
  accent: string;
  accentSoft: string;
  onAccent: string;
};

export type EventTheme = {
  /** Event specific layer, for example the Founders Weekend lakefront look. */
  name: string;
  canopy: string;
  water: string;
  ember: string;
  bark: string;
  mist: string;
};

export type Person = {
  id: Id;
  name: string;
  role: string;
  organization?: string;
};

export type Client = {
  id: Id;
  slug: string;
  name: string;
  tagline: string;
  theme: ClientTheme;
  people: Person[];
};

export type EventDefinition = {
  id: Id;
  clientId: Id;
  slug: string;
  name: string;
  summary: string;
  cadence: string;
};

export type EditionStatus = "planning" | "confirmed" | "complete";

export type Edition = {
  id: Id;
  eventId: Id;
  slug: string;
  label: string;
  status: EditionStatus;
  startDate: string;
  endDate: string;
  location: string;
  venue: string;
  budgetTotal: number;
  guestsExpected: number;
  /** The event's own campaign name, owned by the client rather than by Spark. */
  campaign?: string;
  coordinatorId: Id;
  emceeId: Id;
  theme: EventTheme;
  days: EditionDay[];
  /** Edition this one was reused from, which is how annual events compound. */
  reusedFromEditionId?: Id;
};

export type EditionDay = {
  key: string;
  date: string;
  label: string;
  note: string;
};

export type SparkStatus =
  | "captured"
  | "discussing"
  | "approved"
  | "parked"
  | "declined";

export type SparkCategory =
  | "Program"
  | "Hospitality"
  | "Experience"
  | "Communications"
  | "Logistics"
  | "Generosity";

export type Spark = {
  id: Id;
  editionId: Id;
  title: string;
  detail: string;
  category: SparkCategory;
  status: SparkStatus;
  raisedBy: string;
  raisedOn: string;
  /** Set once the spark reaches Approve or Decline. */
  decision?: string;
  decidedOn?: string;
  /** Records what the approved spark actually created. */
  builds?: SparkBuild[];
};

export type SparkBuildKind =
  | "schedule"
  | "budget"
  | "task"
  | "resource"
  | "runOfShow"
  | "guestComms";

export type SparkBuild = {
  kind: SparkBuildKind;
  refId: Id;
  label: string;
};

export type ScheduleStatus = "confirmed" | "draft";

export type ScheduleTrack =
  | "Program"
  | "Meals"
  | "Experience"
  | "Logistics"
  | "Hospitality";

export type ScheduleItem = {
  id: Id;
  editionId: Id;
  dayKey: string;
  start: string;
  end: string;
  title: string;
  track: ScheduleTrack;
  location: string;
  ownerId: Id;
  status: ScheduleStatus;
  note?: string;
  sparkId?: Id;
};

export type BudgetCategory =
  | "Venue and lodging"
  | "Food and beverage"
  | "Program and speakers"
  | "Experience"
  | "Production and AV"
  | "Gifts and print"
  | "Travel"
  | "Contingency";

export type BudgetLine = {
  id: Id;
  editionId: Id;
  category: BudgetCategory;
  label: string;
  planned: number;
  committed: number;
  actual: number;
  ownerId: Id;
  vendorId?: Id;
  sparkId?: Id;
};

export type TaskStatus = "todo" | "doing" | "blocked" | "done";

export type Task = {
  id: Id;
  editionId: Id;
  title: string;
  ownerId: Id;
  due: string;
  status: TaskStatus;
  area: SparkCategory;
  sparkId?: Id;
};

export type ResourceKind = "vendor" | "supply";

export type Resource = {
  id: Id;
  editionId: Id;
  kind: ResourceKind;
  name: string;
  detail: string;
  ownerId: Id;
  status: "confirmed" | "holding" | "needed";
  quantity?: string;
  sparkId?: Id;
};

export type RunOfShowCue = {
  id: Id;
  editionId: Id;
  scheduleItemId: Id;
  at: string;
  cue: string;
  whoId: Id;
};

export type DecisionStatus = "open" | "decided" | "deferred";

export type Decision = {
  id: Id;
  editionId: Id;
  question: string;
  context: string;
  ownerId: Id;
  status: DecisionStatus;
  outcome?: string;
  sparkId?: Id;
  needsBy: string;
};

export type MeetingAgenda = {
  id: Id;
  editionId: Id;
  meetingOn: string;
  title: string;
  sparkIds: Id[];
  decisionIds: Id[];
  note: string;
};

export type ImpactReviewSection = {
  heading: string;
  entries: string[];
};

export type ImpactReview = {
  id: Id;
  editionId: Id;
  state: "prepared" | "complete";
  headline: string;
  attended?: number;
  spendActual?: number;
  sections: ImpactReviewSection[];
  /** Items marked to carry into the next edition. */
  carryForward: string[];
};

export type PlatformData = {
  people: Person[];
  clients: Client[];
  events: EventDefinition[];
  editions: Edition[];
  sparks: Spark[];
  schedule: ScheduleItem[];
  budget: BudgetLine[];
  tasks: Task[];
  resources: Resource[];
  cues: RunOfShowCue[];
  decisions: Decision[];
  meetings: MeetingAgenda[];
  reviews: ImpactReview[];
};
