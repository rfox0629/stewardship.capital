import { plural } from "./format";
import { platformData } from "./platform-data";
import type {
  BudgetCategory,
  BudgetLine,
  Client,
  Edition,
  EventDefinition,
  Id,
  Person,
  Spark,
  SparkStatus,
} from "./types";

const data = platformData;

export const allClients = () => data.clients;

export const personById = (id: Id): Person =>
  data.people.find((person) => person.id === id) ?? {
    id,
    name: "Unassigned",
    role: "",
  };

export const clientBySlug = (slug: string): Client | undefined =>
  data.clients.find((client) => client.slug === slug);

export const eventsForClient = (clientId: Id): EventDefinition[] =>
  data.events.filter((event) => event.clientId === clientId);

export const editionsForEvent = (eventId: Id): Edition[] =>
  data.editions
    .filter((edition) => edition.eventId === eventId)
    .sort((a, b) => b.slug.localeCompare(a.slug));

export const editionById = (id: Id) =>
  data.editions.find((edition) => edition.id === id);

export type ResolvedEdition = {
  client: Client;
  event: EventDefinition;
  edition: Edition;
};

export const resolveEdition = (
  clientSlug: string,
  eventSlug: string,
  editionSlug: string,
): ResolvedEdition | undefined => {
  const client = clientBySlug(clientSlug);
  if (!client) return undefined;

  const event = data.events.find(
    (candidate) => candidate.clientId === client.id && candidate.slug === eventSlug,
  );
  if (!event) return undefined;

  const edition = data.editions.find(
    (candidate) => candidate.eventId === event.id && candidate.slug === editionSlug,
  );
  if (!edition) return undefined;

  return { client, event, edition };
};

/** Every edition on the platform, newest first, for the planner home. */
export const plannerRows = () =>
  data.editions
    .map((edition) => {
      const event = data.events.find((item) => item.id === edition.eventId)!;
      const client = data.clients.find((item) => item.id === event.clientId)!;
      return { client, event, edition };
    })
    .sort((a, b) => a.edition.startDate.localeCompare(b.edition.startDate));

export const sparksFor = (editionId: Id) =>
  data.sparks.filter((spark) => spark.editionId === editionId);

export const sparkById = (id: Id) => data.sparks.find((spark) => spark.id === id);

export const scheduleFor = (editionId: Id) =>
  data.schedule.filter((item) => item.editionId === editionId);

export const scheduleItemById = (id: Id) =>
  data.schedule.find((item) => item.id === id);

export const budgetFor = (editionId: Id) =>
  data.budget.filter((line) => line.editionId === editionId);

export const budgetLineById = (id: Id) =>
  data.budget.find((line) => line.id === id);

export const tasksFor = (editionId: Id) =>
  data.tasks.filter((task) => task.editionId === editionId);

export const taskById = (id: Id) => data.tasks.find((task) => task.id === id);

export const resourcesFor = (editionId: Id) =>
  data.resources.filter((resource) => resource.editionId === editionId);

export const resourceById = (id: Id) =>
  data.resources.find((resource) => resource.id === id);

export const cuesFor = (editionId: Id) =>
  data.cues.filter((cue) => cue.editionId === editionId);

export const cueById = (id: Id) => data.cues.find((cue) => cue.id === id);

export const decisionsFor = (editionId: Id) =>
  data.decisions.filter((decision) => decision.editionId === editionId);

export const meetingsFor = (editionId: Id) =>
  data.meetings
    .filter((meeting) => meeting.editionId === editionId)
    .sort((a, b) => b.meetingOn.localeCompare(a.meetingOn));

export const reviewFor = (editionId: Id) =>
  data.reviews.find((review) => review.editionId === editionId);

/** Resolves any spark build target to a human readable label. */
export const buildTargetLabel = (kind: string, refId: Id) => {
  switch (kind) {
    case "schedule":
      return scheduleItemById(refId)?.title;
    case "budget":
      return budgetLineById(refId)?.label;
    case "task":
      return taskById(refId)?.title;
    case "resource":
      return resourceById(refId)?.name;
    case "runOfShow":
      return cueById(refId)?.cue;
    case "guestComms":
      return taskById(refId)?.title;
    default:
      return undefined;
  }
};

/* ------------------------------------------------------------- aggregates */

export type BudgetRollup = {
  planned: number;
  committed: number;
  actual: number;
  uncommitted: number;
  byCategory: Array<{
    category: BudgetCategory;
    planned: number;
    committed: number;
    actual: number;
    lines: BudgetLine[];
  }>;
};

export const budgetRollup = (editionId: Id): BudgetRollup => {
  const lines = budgetFor(editionId);
  const totals = lines.reduce(
    (acc, line) => ({
      planned: acc.planned + line.planned,
      committed: acc.committed + line.committed,
      actual: acc.actual + line.actual,
    }),
    { planned: 0, committed: 0, actual: 0 },
  );

  const categories = new Map<BudgetCategory, BudgetLine[]>();
  lines.forEach((line) => {
    const bucket = categories.get(line.category) ?? [];
    bucket.push(line);
    categories.set(line.category, bucket);
  });

  return {
    ...totals,
    uncommitted: totals.planned - totals.committed,
    byCategory: Array.from(categories.entries())
      .map(([category, categoryLines]) => ({
        category,
        planned: categoryLines.reduce((sum, line) => sum + line.planned, 0),
        committed: categoryLines.reduce((sum, line) => sum + line.committed, 0),
        actual: categoryLines.reduce((sum, line) => sum + line.actual, 0),
        lines: categoryLines,
      }))
      .sort((a, b) => b.planned - a.planned),
  };
};

export const sparkCounts = (editionId: Id) => {
  const sparks = sparksFor(editionId);
  const count = (status: SparkStatus) =>
    sparks.filter((spark) => spark.status === status).length;
  return {
    total: sparks.length,
    captured: count("captured"),
    discussing: count("discussing"),
    approved: count("approved"),
    parked: count("parked"),
    declined: count("declined"),
  };
};

export const scheduleCounts = (editionId: Id) => {
  const items = scheduleFor(editionId);
  return {
    total: items.length,
    confirmed: items.filter((item) => item.status === "confirmed").length,
    draft: items.filter((item) => item.status === "draft").length,
  };
};

export const taskCounts = (editionId: Id) => {
  const tasks = tasksFor(editionId);
  return {
    total: tasks.length,
    open: tasks.filter((task) => task.status !== "done").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
};

/**
 * "What needs attention?" for the event home. Deliberately narrow. If this
 * list ever gets long, the surface is wrong, not the list.
 */
export type AttentionItem = {
  id: string;
  label: string;
  detail: string;
  tone: "urgent" | "watch";
  href?: string;
};

export const attentionFor = (editionId: Id, hrefs: {
  sparks: string;
  schedule: string;
  budget: string;
  tasks: string;
  meeting: string;
  resources: string;
}): AttentionItem[] => {
  const items: AttentionItem[] = [];

  const blocked = tasksFor(editionId).filter((task) => task.status === "blocked");
  blocked.forEach((task) => {
    items.push({
      id: `blocked-${task.id}`,
      label: "Blocked task",
      detail: `${task.title}. Owner ${personById(task.ownerId).name}.`,
      tone: "urgent",
      href: hrefs.tasks,
    });
  });

  const openDecisions = decisionsFor(editionId).filter(
    (decision) => decision.status === "open",
  );
  if (openDecisions.length > 0) {
    items.push({
      id: "decisions",
      label: plural(openDecisions.length, "open decision"),
      detail: `Earliest needed by ${openDecisions
        .map((decision) => decision.needsBy)
        .sort()[0]}.`,
      tone: "urgent",
      href: hrefs.meeting,
    });
  }

  const drafts = scheduleFor(editionId).filter((item) => item.status === "draft");
  if (drafts.length > 0) {
    items.push({
      id: "drafts",
      label: `${plural(drafts.length, "schedule item")} still draft`,
      detail: drafts.map((item) => item.title).join(", ") + ".",
      tone: "watch",
      href: hrefs.schedule,
    });
  }

  const needed = resourcesFor(editionId).filter(
    (resource) => resource.status === "needed",
  );
  if (needed.length > 0) {
    items.push({
      id: "resources",
      label: `${plural(needed.length, "resource")} not secured`,
      detail: needed.map((resource) => resource.name).join(", ") + ".",
      tone: "watch",
      href: hrefs.resources,
    });
  }

  const rollup = budgetRollup(editionId);
  if (rollup.uncommitted > 0) {
    items.push({
      id: "budget",
      label: "Budget not fully committed",
      detail: `${rollup.uncommitted.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })} of the plan is still uncommitted.`,
      tone: "watch",
      href: hrefs.budget,
    });
  }

  return items;
};

export type SparkWithBuilds = Spark;
