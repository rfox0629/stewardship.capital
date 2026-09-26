import { headers } from "next/headers";

import { isProductHost, productPath } from "@lib/spark/hosts";

type Page = "/" | "/contact";

/**
 * Where one of TentMAiKER's pages lives for the person reading this one.
 *
 * On tentmaiker.com each page has its clean address. Everywhere else (the
 * shared preview, localhost) there is no host to route by, so the page is
 * reached at its internal path under /tentmaiker, the way the front page
 * already is. Worked out from the request's host, as the proxy does, so a
 * link never sends someone through a redirect to get where it meant.
 */
export async function pageHref(page: Page): Promise<string> {
  const request = await headers();
  const host = request.get("x-forwarded-host") ?? request.get("host");
  return isProductHost(host) ? page : (productPath(page) ?? page);
}
