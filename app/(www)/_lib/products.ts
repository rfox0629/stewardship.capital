import type { PanelMode } from "../_components/panel-field";

/**
 * The register of what Stewardship.Capital is building.
 *
 * Adding a company is adding one object here. The homepage panels, the work
 * index, and every product page read from this list, which is the whole point
 * of a parent build company: the architecture holds the next one already.
 */
export type Product = {
  slug: string;
  index: string;
  name: string;
  category: string;
  status: string;
  proposition: string;
  /** Copy not yet written. Rendered as an obvious slot, never as a claim. */
  pending?: boolean;
  mode: PanelMode;
  body?: string[];
  externalLabel?: string;
  externalHref?: string;
};

export const products: Product[] = [
  {
    slug: "spark",
    index: "01",
    name: "Spark",
    category: "Event operating system",
    status: "Founder preview",
    proposition:
      "Ideas become a confirmed plan, and every line of it traces back to the idea that caused it.",
    mode: "converge",
    body: [
      "Most event plans break for the same reason: good ideas and settled commitments end up in the same list, and nobody can tell which is which.",
      "Spark keeps them apart. Every idea lands in one place and stays there until someone actually decides. Approving an idea is what creates the schedule item, the budget line, the task, the supplier, and the run of show cue, and each of those keeps a link back to the idea that caused it.",
      "Built on a platform, client, event, edition architecture, so an annual gathering compounds instead of restarting. The first client is Shine, and the first event is Founders Weekend 2026.",
    ],
    externalLabel: "Open the operating system preview",
    externalHref: "/events-os",
  },
  {
    slug: "autopilot-strategies",
    index: "02",
    name: "AutoPilot Strategies",
    category: "Company",
    status: "In development",
    proposition: "Building businesses that don't depend on you.",
    mode: "path",
    body: [],
  },
];

export const productBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);
