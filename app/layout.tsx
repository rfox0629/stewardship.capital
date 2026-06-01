import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stewardship Capital",
  description:
    "A Christian stewardship operating system for families, business owners, and investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
