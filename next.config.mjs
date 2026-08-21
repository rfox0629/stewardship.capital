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
      // /events was the Stewardship Events marketing page. That product is now
      // Spark, and it lives in the work register.
      { source: "/events", destination: "/work/spark", permanent: false },
    ];
  },
};

export default nextConfig;
