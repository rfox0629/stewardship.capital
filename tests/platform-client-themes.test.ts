import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM_THEME,
  clientThemeFor,
  clientThemeVariables,
} from "../lib/platform/client-themes.ts";

/* A client's page wears the client, and no client wears the product. */

test("SHINE's page is set in SHINE's own colours and type", () => {
  const theme = clientThemeFor("shine");
  /* The three values shineintheworld.org publishes as its own properties. */
  assert.equal(theme.colors.background, "hsl(55 35.29% 93.33%)");
  assert.equal(theme.colors.ink, "hsl(120 16.46% 15.49%)");
  assert.equal(theme.colors.accent, "hsl(67.39 95.83% 71.76%)");
  assert.equal(theme.fonts, "shine");
  assert.equal(theme.website?.href, "https://www.shineintheworld.org/");
});

test("a client without a theme wears the platform's own, not a guess", () => {
  assert.equal(clientThemeFor("chicken-coop-company"), PLATFORM_THEME);
  assert.equal(clientThemeFor("nobody-yet"), PLATFORM_THEME);
});

test("a theme only ever sets the workspace's own properties", () => {
  /* The orange node is Spark's. Client and event themes set --ev-*; the
     platform's client pages set --cw-*; nothing here reaches --sp-*. */
  for (const slug of ["shine", "chicken-coop-company"]) {
    const names = Object.keys(clientThemeVariables(clientThemeFor(slug)));
    assert.ok(names.length > 0);
    assert.ok(names.every((name) => name.startsWith("--cw-")), names.join(", "));
  }
});
