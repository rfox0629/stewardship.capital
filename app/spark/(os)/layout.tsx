import type { Metadata } from "next";

import "../spark.css";

export const metadata: Metadata = {
  title: {
    default: "Spark",
    template: "%s | Spark",
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
