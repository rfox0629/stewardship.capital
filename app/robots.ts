import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal preview surfaces and the authenticated platform stay out
        // of search while product strategy is being developed.
        //
        // The weekend guide at /shine is not listed here on purpose. It is
        // kept out of search by noindex on the pages themselves, which a
        // crawler has to fetch the page to read. Disallowing it here would
        // stop the messaging apps fetching it too, and a guest would be sent
        // a link that previews as nothing.
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
