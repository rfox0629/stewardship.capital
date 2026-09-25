/**
 * Where an engagement opens from the platform home.
 *
 * An engagement that runs on a product opens that product's workspace. One
 * that does not opens Stewardship.Capital's own engagement page. The
 * decision is one nullable column on the engagement row, read here and
 * nowhere else, so adding a product later is adding a line to this file.
 *
 * The platform home is the company's, and the product lives on its own
 * domain, so a link from one to the other is a whole URL rather than a path.
 */

import { cleanPath, PRODUCT_ORIGIN } from "../spark/hosts.ts";

/* The column's value, unchanged: this is data in the database, not a name on
   a screen, and renaming it would be a migration rather than a cleanup. */
export const SPARK_PRODUCT = "spark";

export type EngagementRef = {
  organizationSlug: string;
  engagementSlug: string;
  seriesSlug: string | null;
  editionLabel: string | null;
  productKey: string | null;
};

export const platformEngagementPath = (
  organizationSlug: string,
  engagementSlug: string,
) => `/platform/clients/${organizationSlug}/${engagementSlug}`;

export const sparkWorkspacePath = (ref: EngagementRef) =>
  `/spark/c/${ref.organizationSlug}/e/${ref.seriesSlug ?? "current"}/${
    ref.editionLabel ?? "current"
  }`;

export const engagementHref = (ref: EngagementRef): string =>
  ref.productKey === SPARK_PRODUCT
    ? `${PRODUCT_ORIGIN}${cleanPath(sparkWorkspacePath(ref))}`
    : platformEngagementPath(ref.organizationSlug, ref.engagementSlug);

/** What the platform home says next to the name, when the product matters. */
export const productLabel = (productKey: string | null): string | null =>
  productKey === SPARK_PRODUCT ? "Tentmaiker" : null;
