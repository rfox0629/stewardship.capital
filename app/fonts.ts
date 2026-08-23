import { Archivo, Inter } from "next/font/google";

/**
 * One family carries the whole site: Archivo variable, with the width axis
 * available so the wordmark and display headlines can run expanded while UI
 * text stays normal. Inter is retained only for the legacy platform surfaces
 * and the Stewardship Events operating system.
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
