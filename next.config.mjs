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
    const company = [{ type: "host", value: "(www\\.)?stewardship\\.capital" }];
    /* Retired addresses: everywhere except the product's domain. */
    const elsewhere = (rules) => rules.map((rule) => ({ ...rule, missing: notTheProduct }));
    /* Addresses that have moved to the product: only where the old links are. */
    const moved = (rules) => rules.map((rule) => ({ ...rule, has: company }));
    return [
      ...elsewhere([
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
      ]),
      ...moved([
      /* The product's public addresses on the company's domain, now that the
         product answers at its own. Sent across rather than served twice, so
         there is one address for each thing and links already in inboxes,
         messages and bookmarks keep working.

         Temporary on purpose: this is a cutover, and a permanent redirect is
         remembered by browsers long after anybody could change their mind.

         Not listed, deliberately: /spark/signout, which has to clear the
         session on the domain it was made on, and /platform, which is the
         company's own console rather than a public product address. */
      { source: "/spark", destination: "https://tentmaiker.com/", permanent: false },
      { source: "/spark/c/:path*", destination: "https://tentmaiker.com/c/:path*", permanent: false },
      { source: "/spark/i/:token", destination: "https://tentmaiker.com/i/:token", permanent: false },
      { source: "/spark/auth/:path*", destination: "https://tentmaiker.com/auth/:path*", permanent: false },
      { source: "/shine/2026", destination: "https://tentmaiker.com/shine/2026", permanent: false },
      { source: "/shine/2026/:path*", destination: "https://tentmaiker.com/shine/2026/:path*", permanent: false },
      ]),
    ];
  },
};

export default nextConfig;
