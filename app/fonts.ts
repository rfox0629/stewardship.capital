import { Fraunces, Inter } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--sc-font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

export const text = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--sc-font-text",
});
