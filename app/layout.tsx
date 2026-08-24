import type { Metadata } from "next";

import { display, text } from "./fonts";
import "./globals.css";
import "./styles/sc-tokens.css";

export const metadata: Metadata = {
  title: {
    default: "Stewardship Capital",
    template: "%s | Stewardship Capital",
  },
  description:
    "Stewardship Capital helps people, families, organizations, and ventures steward time, talent, and treasure as one entrusted system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
