import assert from "node:assert/strict";
import test from "node:test";

import {
  engagementHref,
  productLabel,
} from "../lib/platform/engagement-href.ts";

/* One column decides which workspace opens. */

const shine = {
  organizationSlug: "shine",
  engagementSlug: "founders-weekend-2026",
  seriesSlug: "founders-weekend",
  editionLabel: "2026",
  productKey: "spark",
};

const coop = {
  organizationSlug: "chicken-coop-company",
  engagementSlug: "growth-operating-system",
  seriesSlug: "growth-operating-system",
  editionLabel: null,
  productKey: null,
};

test("a product engagement opens the product, on the product's own domain", () => {
  /* The platform home is the company's and the product is not, so the link
     leaves the site: a whole URL, at the address the product publishes. */
  assert.equal(engagementHref(shine), "https://tentmaiker.com/c/shine/e/founders-weekend/2026");
  assert.equal(productLabel(shine.productKey), "Tentmaiker");
});

test("an engagement on no product opens the Stewardship.Capital engagement page", () => {
  assert.equal(
    engagementHref(coop),
    "/platform/clients/chicken-coop-company/growth-operating-system",
  );
  assert.equal(productLabel(coop.productKey), null);
});

test("an unknown product is not quietly Spark", () => {
  const other = { ...coop, productKey: "entrust" };
  assert.equal(
    engagementHref(other),
    "/platform/clients/chicken-coop-company/growth-operating-system",
  );
  assert.equal(productLabel("entrust"), null);
});
