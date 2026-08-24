import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal preview surfaces and the authenticated platform stay out
        // of search while product strategy is being developed.
        disallow: [
          "/internal/",
          "/spark/",
          "/dashboard/",
          "/assessment",
          "/login",
          "/signup",
        ],
      },
    ],
  };
}
