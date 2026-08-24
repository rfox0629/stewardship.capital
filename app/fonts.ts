import { Archivo, Fraunces, Inter, Public_Sans } from "next/font/google";
import localFont from "next/font/local";

/**
 * Two font systems, deliberately separate.
 *
 * Archivo carries Stewardship.Capital and Spark. Inter is retained only for
 * the legacy platform surfaces.
 *
 * The event faces exist for themed engagements and are only referenced
 * through the theme allowlist in lib/spark/theme.ts:
 *
 *   Fraunces      the display slot. SHINE's approved face is Hagrid, which is
 *                 commercially licensed and cannot be bundled; Fraunces holds
 *                 the slot until a licence exists, and the swap is one edit
 *                 in the theme allowlist.
 *   Aileron       subheads. CC0, self hosted from the Fontsource files.
 *   Public Sans   paragraphs and operational UI. SIL OFL.
 */
export const display = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["wdth"],
});

export const text = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-legacy",
});

export const eventDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-event-display",
  axes: ["SOFT", "WONK", "opsz"],
});

export const eventBody = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-event-body",
});

export const eventSub = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/aileron/files/aileron-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/aileron/files/aileron-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/aileron/files/aileron-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-event-sub",
});
