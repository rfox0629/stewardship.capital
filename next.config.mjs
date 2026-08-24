import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      // Spark has a permanent home. Everything that used to address it points
      // there, so links already in inboxes keep working.
      { source: "/events-os", destination: "/spark", permanent: false },
      { source: "/events-os/:path*", destination: "/spark/:path*", permanent: false },
      { source: "/i/:token", destination: "/spark/i/:token", permanent: false },

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
    ];
  },
};

export default nextConfig;
