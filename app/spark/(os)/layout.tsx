import type { Metadata } from "next";

import "../spark.css";

export const metadata: Metadata = {
  title: {
    absolute: "Tentmaiker",
    template: "%s | Tentmaiker",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function SparkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="eo-frame">{children}</div>;
}
