import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Proposal", template: "%s | TentMAiKER" },
  /* Shared by link, to the person it names. Never listed, never indexed. */
  robots: { index: false, follow: false, nocache: true },
};

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
