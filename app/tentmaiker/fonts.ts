import localFont from "next/font/local";

/**
 * TentMAiKER's one face. Loaded here rather than in app/fonts.ts so that it
 * ships with this page only and nothing else in the application pays for it.
 *
 * Self hosted from the Fontsource files, like Aileron in app/fonts.ts, rather
 * than fetched from Google at build time: that fetch failed often enough to
 * break deployments, and a build should not depend on another service being
 * reachable. Sora is SIL OFL.
 */
export const sora = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-tm",
});
