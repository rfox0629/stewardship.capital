/**
 * Engagement theming, validated.
 *
 * A theme is data in the engagement row, and data does not get to write CSS.
 * Every value is checked against the narrow shape it claims to be before it
 * can become a custom property: colors must be six digit hex, images must be
 * repo local paths under /clients/, fonts must name a slot from the loaded
 * set, and copy is plain text with a length cap. Anything that does not fit
 * is dropped and the default takes its place, so a hostile theme degrades to
 * the quiet Spark look rather than to an injection.
 *
 * The variables it produces are all --ev-*. Spark's own tokens are --sp-* and
 * the site's are bare names in tokens.css; a theme cannot name either, which
 * is what keeps the Spark core, including the orange node, out of a client's
 * reach. That rule is structural, not a convention.
 */

export type EventFontSlot = "display" | "sub" | "body";

/** The loaded families a theme may choose between, per slot. Hagrid is the
 *  approved display face for SHINE but is commercially licensed; Fraunces
 *  holds the slot until the licence exists, and swapping is one edit here. */
const FONTS: Record<EventFontSlot, Record<string, string>> = {
  display: {
    fraunces: "var(--font-event-display)",
    archivo: "var(--font-display)",
  },
  sub: {
    aileron: "var(--font-event-sub)",
    "public-sans": "var(--font-event-body)",
  },
  body: {
    "public-sans": "var(--font-event-body)",
    aileron: "var(--font-event-sub)",
  },
};

export type EngagementTheme = {
  colors: {
    /** Deep anchor: mastheads, display type. */
    primary: string;
    /** Warm counterpoint: eyebrows, category marks, small accents. */
    secondary: string;
    /** Confirmation and calm: confirmed states, links. */
    accent: string;
    /** The page itself. */
    surface: string;
    /** A quiet step off the surface, for alternate rows and asides. */
    surfaceRaised: string;
    /** Body text on the surface. */
    ink: string;
    /** Rare emphasis. Used sparingly or not at all. */
    deep: string;
  };
  fonts: Record<EventFontSlot, string>;
  /** Repo local image paths, already shape checked. */
  images: {
    organizationLogo?: string;
    eventMark?: string;
    hero?: string;
    /** A small set for atmosphere on the home surface. Never more than four. */
    gallery: string[];
  };
  copy: {
    welcome?: string;
    tagline?: string;
  };
  /** Whether the quiet Powered by Spark line renders in the footer. */
  poweredBySpark: boolean;
};

const DEFAULT: EngagementTheme = {
  colors: {
    primary: "#22262e",
    secondary: "#6b7280",
    accent: "#447c9d",
    surface: "#f7f6f3",
    surfaceRaised: "#efede8",
    ink: "#26282b",
    deep: "#22262e",
  },
  fonts: {
    display: FONTS.display.archivo,
    sub: FONTS.sub["public-sans"],
    body: FONTS.body["public-sans"],
  },
  images: { gallery: [] },
  copy: {},
  poweredBySpark: true,
};

const HEX = /^#[0-9a-f]{6}$/i;
const IMAGE = /^\/clients\/[a-z0-9][a-z0-9/_-]*\.(png|jpe?g|webp|svg)$/i;
const COPY_MAX = 280;

const readColor = (value: unknown, fallback: string): string =>
  typeof value === "string" && HEX.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;

const readImage = (value: unknown): string | undefined =>
  typeof value === "string" && IMAGE.test(value.trim()) ? value.trim() : undefined;

const readCopy = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return cleaned ? cleaned.slice(0, COPY_MAX) : undefined;
};

const readFont = (slot: EventFontSlot, value: unknown): string => {
  const table = FONTS[slot];
  if (typeof value === "string" && value in table) return table[value];
  return DEFAULT.fonts[slot];
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Never throws. A theme that does not parse is the default theme. */
export const parseEngagementTheme = (raw: unknown): EngagementTheme => {
  const source = record(raw);
  const colors = record(source.colors);
  const fonts = record(source.fonts);
  const images = record(source.images);
  const copy = record(source.copy);

  return {
    colors: {
      primary: readColor(colors.primary, DEFAULT.colors.primary),
      secondary: readColor(colors.secondary, DEFAULT.colors.secondary),
      accent: readColor(colors.accent, DEFAULT.colors.accent),
      surface: readColor(colors.surface, DEFAULT.colors.surface),
      surfaceRaised: readColor(colors.surfaceRaised, DEFAULT.colors.surfaceRaised),
      ink: readColor(colors.ink, DEFAULT.colors.ink),
      deep: readColor(colors.deep, DEFAULT.colors.deep),
    },
    fonts: {
      display: readFont("display", fonts.display),
      sub: readFont("sub", fonts.sub),
      body: readFont("body", fonts.body),
    },
    images: {
      organizationLogo: readImage(images.organizationLogo),
      eventMark: readImage(images.eventMark),
      hero: readImage(images.hero),
      gallery: (Array.isArray(images.gallery) ? images.gallery : [])
        .map(readImage)
        .filter((path): path is string => Boolean(path))
        .slice(0, 4),
    },
    copy: {
      welcome: readCopy(copy.welcome),
      tagline: readCopy(copy.tagline),
    },
    poweredBySpark: source.poweredBySpark !== false,
  };
};

/**
 * The only bridge from theme to CSS. Everything here has already been
 * validated to a shape that cannot escape a declaration value.
 */
export const themeVariables = (
  theme: EngagementTheme,
): Record<string, string> => ({
  "--ev-primary": theme.colors.primary,
  "--ev-secondary": theme.colors.secondary,
  "--ev-accent": theme.colors.accent,
  "--ev-surface": theme.colors.surface,
  "--ev-surface-raised": theme.colors.surfaceRaised,
  "--ev-ink": theme.colors.ink,
  "--ev-deep": theme.colors.deep,
  "--ev-display": theme.fonts.display,
  "--ev-sub": theme.fonts.sub,
  "--ev-body": theme.fonts.body,
});
