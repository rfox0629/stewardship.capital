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

test("a Spark engagement opens its Spark workspace, exactly where it always did", () => {
  assert.equal(engagementHref(shine), "/spark/c/shine/e/founders-weekend/2026");
  assert.equal(productLabel(shine.productKey), "Spark");
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
