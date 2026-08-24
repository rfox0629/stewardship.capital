import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Spark",
    template: "%s | Spark",
  },
  /* Private product. Nothing under /spark belongs in an index, including the
     front door, which is a sign in screen and not a landing page. */
  robots: { index: false, follow: false, nocache: true },
};

export default function SparkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
