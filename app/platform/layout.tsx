import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Platform",
    template: "%s | Stewardship.Capital",
  },
  /* Private. The home and its sign in belong in no index. */
  robots: { index: false, follow: false, nocache: true },
};

export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
