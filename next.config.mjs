import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    /* These are Stewardship.Capital's own retired addresses. On the product's
       own domain the same paths mean something else, or nothing at all, so
       every rule below is skipped there and applies everywhere else, which
       includes localhost and the preview deployments. */
    const notTheProduct = [{ type: "host", value: "(www\\.)?tentmaiker\\.com" }];
    const onCompany = (rules) => rules.map((rule) => ({ ...rule, missing: notTheProduct }));
    return onCompany([
      // Spark has a permanent home. Everything that used to address it points
      // there, so links already in inboxes keep working.
      { source: "/events-os", destination: "/spark", permanent: false },
      { source: "/events-os/:path*", destination: "/spark/:path*", permanent: false },
      { source: "/i/:token", destination: "/spark/i/:token", permanent: false },

      // The platform home is Stewardship.Capital's, not Spark's. It moved up
      // a level; the old address keeps working for anyone who bookmarked it.
      { source: "/spark/platform", destination: "/platform", permanent: false },
      { source: "/spark/platform/:path*", destination: "/platform/:path*", permanent: false },

      // /more is temporary on purpose. When Stewardship.Capital has more than
      // one public product it becomes the directory of them, and /spark stays
      // exactly where it is.
      { source: "/more", destination: "/spark", permanent: false },

      // Public destinations that no longer exist all resolve to the single
      // way in. Spark is the only product exposed publicly.
      { source: "/events", destination: "/spark", permanent: false },
      { source: "/work", destination: "/spark", permanent: false },
      { source: "/work/:slug", destination: "/spark", permanent: false },
      { source: "/about", destination: "/", permanent: false },
      { source: "/connect", destination: "/spark", permanent: false },
    ]);
  },
};

export default nextConfig;
