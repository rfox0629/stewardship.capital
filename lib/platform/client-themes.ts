/**
 * How a client's workspace on the platform looks.
 *
 * The platform home is Stewardship.Capital's and wears its graphite. A
 * client's own page wears the client: their colours, their type, their
 * website. Everything a page needs to do that is a value here, read through
 * the `--cw-*` custom properties the workspace layout sets, so a new client
 * is a new entry and no new CSS.
 *
 * Only ever reached by a known slug. A client without an entry gets the
 * platform's own look, which is what the page should be when nobody has
 * decided otherwise.
 *
 * This is the platform's theming, for Stewardship.Capital's own pages. The
 * product's event themes live in lib/spark/theme.ts and set `--ev-*`, and the
 * two never touch: the orange node is Spark's and no client reaches it.
 */

export type ClientTheme = {
  /** How the client names itself at the top of its own page. */
  displayName?: string;
  website?: { label: string; href: string };
  colors: {
    background: string;
    ink: string;
    muted: string;
    line: string;
    card: string;
    accent: string;
    onAccent: string;
  };
  /**
   * Which loaded faces the page uses. The faces themselves are loaded in
   * app/fonts.ts and attached by the layout; this only names the kit, so the
   * registry stays free of anything that cannot run in a plain test.
   */
  fonts: "platform" | "shine";
  /** Headings set in capitals, as a condensed display face usually is. */
  displayUppercase: boolean;
};

/** Stewardship.Capital's own: graphite, crisp white, and the signal. */
export const PLATFORM_THEME: ClientTheme = {
  colors: {
    background: "#0a0b0d",
    ink: "#fafafa",
    muted: "#8a8f98",
    line: "#1f2229",
    card: "#0d0f12",
    accent: "#ff4d00",
    onAccent: "#0a0b0d",
  },
  fonts: "platform",
  displayUppercase: false,
};

/*
 * SHINE, as shineintheworld.org sets it: an off white ground, deep green
 * type, bright lime for the one thing to press, League Gothic headings and
 * Futura PT body. The three colours are the site's own custom properties,
 * read from the page rather than approximated.
 */
const SHINE_THEME: ClientTheme = {
  displayName: "Shine International",
  website: { label: "Shine website", href: "https://www.shineintheworld.org/" },
  colors: {
    background: "hsl(55 35.29% 93.33%)",
    ink: "hsl(120 16.46% 15.49%)",
    muted: "hsl(120 9% 34%)",
    line: "hsl(120 16.46% 15.49% / 0.16)",
    card: "hsl(55 40% 97.5%)",
    accent: "hsl(67.39 95.83% 71.76%)",
    onAccent: "hsl(120 16.46% 15.49%)",
  },
  fonts: "shine",
  displayUppercase: true,
};

const THEMES: Record<string, ClientTheme> = {
  shine: SHINE_THEME,
};

/** The theme for a client, by slug, or the platform's own when it has none. */
export const clientThemeFor = (slug: string): ClientTheme =>
  THEMES[slug] ?? PLATFORM_THEME;

/** The custom properties a theme sets on the workspace root. */
export const clientThemeVariables = (theme: ClientTheme): Record<string, string> => ({
  "--cw-bg": theme.colors.background,
  "--cw-ink": theme.colors.ink,
  "--cw-muted": theme.colors.muted,
  "--cw-line": theme.colors.line,
  "--cw-card": theme.colors.card,
  "--cw-accent": theme.colors.accent,
  "--cw-on-accent": theme.colors.onAccent,
  "--cw-display-transform": theme.displayUppercase ? "uppercase" : "none",
});
