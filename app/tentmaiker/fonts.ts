import { Sora } from "next/font/google";

/**
 * Tent MAiKER's one face. Loaded here rather than in app/fonts.ts so that it
 * ships with this page only and nothing else in the application pays for it.
 */
export const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "500", "600"],
  variable: "--font-tm",
});
