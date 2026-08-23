import type { Metadata } from "next";

import { display, text } from "./fonts";
import "./styles/tokens.css";

export const metadata: Metadata = {
  title: {
    default: "Stewardship.Capital",
    template: "%s | Stewardship.Capital",
  },
  description:
    "We turn vision into systems, products, and experiences built to move.",
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
