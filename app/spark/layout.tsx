import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    /* Absolute, so the company's title template does not sign the product's
       front door. The product carries its own name on its own domain. */
    absolute: "Tentmaiker",
    template: "%s | Tentmaiker",
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
