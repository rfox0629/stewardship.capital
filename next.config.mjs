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
      // Public destinations that no longer exist all resolve to the single
      // way in. Spark is the only product exposed publicly.
      { source: "/events", destination: "/more", permanent: false },
      { source: "/work", destination: "/more", permanent: false },
      { source: "/work/:slug", destination: "/more", permanent: false },
      { source: "/about", destination: "/", permanent: false },
      { source: "/connect", destination: "/more", permanent: false },
    ];
  },
};

export default nextConfig;
