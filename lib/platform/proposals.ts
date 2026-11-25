/**
 * The proposals a client can be shown, as data.
 *
 * A proposal is an executive presentation: five short sections, a working
 * demo, and the numbers. Everything a page needs to say is a value here, so
 * the figures can be checked by a test rather than read off a screen, and so
 * the same content renders for staff on the platform and for the person a
 * share link was issued to.
 *
 * Presented by TentMAiKER. Stewardship.Capital is the infrastructure the
 * client portal runs on and appears nowhere in a proposal.
 */

export type ProposalSectionKey =
  | "overview"
  | "demo"
  | "future"
  | "investment"
  | "ownership";

export type ProposalSection = { key: ProposalSectionKey; label: string };

export type Milestone = { label: string; amount: number; note: string };

export type FutureModule = { key: string; name: string; summary: string };

export type ContinuityPath = { key: string; name: string; summary: string };

export type Proposal = {
  slug: string;
  organizationSlug: string;
  title: string;
  subtitle: string;
  presenter: { name: string; mark: string };
  sections: ProposalSection[];
  overview: {
    headline: string;
    lede: string;
    vision: string;
    pillars: Array<{ title: string; body: string }>;
  };
  investment: {
    total: number;
    timeline: string;
    headlines: string[];
    milestones: Milestone[];
    included: string[];
    infrastructure: {
      lines: Array<{ label: string; amount: number }>;
      totalRange: string;
      coverage: string;
      boundary: string;
    };
  };
  future: {
    foundation: { name: string; summary: string };
    modules: FutureModule[];
    exclusion: string;
  };
  ownership: {
    coveredMonths: number;
    paths: ContinuityPath[];
    noCommitment: string;
  };
  close: { line: string; byline: string };
};

export const SECTIONS: ProposalSection[] = [
  { key: "overview", label: "Overview" },
  { key: "demo", label: "Live Demo" },
  { key: "future", label: "Future Platform" },
  { key: "investment", label: "Investment" },
  { key: "ownership", label: "Ownership & Continuity" },
];

export const PRESENTER = { name: "TentMAiKER", mark: "TENTMAiKER" };

const MINISTRY_IMPACT_PLATFORM: Proposal = {
  slug: "ministry-impact-platform",
  organizationSlug: "shine",
  title: "Ministry Impact Platform",
  subtitle: "One place for the ministry's reporting, built to carry more.",
  presenter: PRESENTER,
  sections: SECTIONS,
  overview: {
    headline: "Begin with the reporting the ministry needs now.",
    lede:
      "A custom application for SHINE that gathers field reports as they happen, turns them into the numbers the leadership and the board ask for, and does it without spreadsheets passed from inbox to inbox.",
    vision:
      "This follows the original vision discussed with Mike Anderson: solve the immediate ministry reporting need first, and build it on a foundation that can support broader organizational capabilities in the future.",
    pillars: [
      {
        title: "Field reporting that fits the work",
        body: "Short, structured reports from the field, on a phone, in minutes. Each one lands in the right region, period, and ministry line without anyone retyping it.",
      },
      {
        title: "Impact that adds itself up",
        body: "Outreaches, people reached, decisions, follow ups, and trainings roll up by region and quarter the moment a report is saved. The executive view is always current.",
      },
      {
        title: "A foundation, not a form",
        body: "The data model, sign in, and access controls are built once, for SHINE alone, so later modules extend the same system rather than starting over.",
      },
    ],
  },
  investment: {
    total: 9500,
    timeline: "4–6 weeks",
    headlines: [
      "Fixed development investment",
      "Estimated development timeline",
      "First six months of standard platform infrastructure included following launch",
      "Custom application ownership and handoff to SHINE",
    ],
    milestones: [
      { label: "Project kickoff", amount: 2850, note: "Planning and design confirmed, build begins." },
      { label: "Working platform review", amount: 3800, note: "The platform running on demo data, reviewed together." },
      { label: "Final deployment and handoff", amount: 2850, note: "Live, documented, and in SHINE's hands." },
    ],
    included: [
      "Planning",
      "Design",
      "Development",
      "Testing",
      "Deployment",
      "Documentation",
      "Training",
      "30-day post-launch bug-fix support",
    ],
    infrastructure: {
      lines: [
        { label: "Database and backend infrastructure", amount: 25 },
        { label: "Application hosting", amount: 20 },
      ],
      totalRange: "$45–$60/month",
      coverage:
        "TentMAiKER covers standard infrastructure costs for the first six months following launch.",
      boundary:
        "Additional usage costs or optional services beyond the agreed infrastructure allowance require approval. Infrastructure coverage is not unlimited technical support or development.",
    },
  },
  future: {
    foundation: {
      name: "Ministry Impact Platform",
      summary:
        "The initial foundation: SHINE's own data model, sign in, access controls, and reporting. Every later module builds on it.",
    },
    modules: [
      { key: "hr", name: "HR & People Management", summary: "Staff and missionary records, roles, and onboarding on the same people the reports already name." },
      { key: "finance", name: "Accounting & Finance", summary: "Budgets, funds, and spending beside the ministry results they paid for." },
      { key: "comms", name: "Communications", summary: "Updates to partners and teams drawn from live reporting rather than rewritten by hand." },
      { key: "donors", name: "Donor Management", summary: "Partners, gifts, and pledges, connected to the impact they make possible." },
      { key: "ops", name: "Ministry Operations", summary: "Events, trips, and teams planned against the regions and seasons the reports describe." },
      { key: "docs", name: "Document Management", summary: "Policies, agreements, and field materials, versioned and findable." },
      { key: "workflow", name: "Workflow Automation", summary: "Approvals, reminders, and handoffs that run themselves once a report or request is in." },
      { key: "reporting", name: "Executive Reporting", summary: "Board and leadership views across every module, from one source of truth." },
    ],
    exclusion: "These additional modules are not included in the current investment.",
  },
  ownership: {
    coveredMonths: 6,
    paths: [
      {
        key: "independent",
        name: "Independent Ownership",
        summary:
          "Transfer the application infrastructure and account management to SHINE. SHINE assumes ongoing infrastructure costs and can manage the system internally or through another provider.",
      },
      {
        key: "maintenance",
        name: "Continued Maintenance",
        summary:
          "Establish a separate maintenance agreement with TentMAiKER covering technical support, hosting management, security updates, and system upkeep.",
      },
      {
        key: "expansion",
        name: "Platform Expansion",
        summary:
          "Continue developing the SHINE ecosystem, incorporating ongoing infrastructure and maintenance into a broader development agreement where appropriate.",
      },
    ],
    noCommitment: "There is no commitment to a maintenance contract or additional development.",
  },
  close: {
    line: "Build the foundation once. Expand it as the ministry grows.",
    byline: "Presented by TentMAiKER.",
  },
};

const PROPOSALS: Proposal[] = [MINISTRY_IMPACT_PLATFORM];

/** The proposals a client has, newest first. */
export const proposalsFor = (organizationSlug: string): Proposal[] =>
  PROPOSALS.filter((proposal) => proposal.organizationSlug === organizationSlug);

/** One proposal, by the client it belongs to and its slug, or null. */
export const proposalFor = (
  organizationSlug: string,
  proposalSlug: string,
): Proposal | null =>
  PROPOSALS.find(
    (proposal) =>
      proposal.organizationSlug === organizationSlug && proposal.slug === proposalSlug,
  ) ?? null;

export const milestoneTotal = (proposal: Proposal): number =>
  proposal.investment.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

export const infrastructureMonthly = (proposal: Proposal): number =>
  proposal.investment.infrastructure.lines.reduce((sum, line) => sum + line.amount, 0);

export const money = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
