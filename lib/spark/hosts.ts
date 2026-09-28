import { PLATFORM_HOME, SPARK_BASE } from "./paths.ts";

/**
 * Two domains, one application.
 *
 * The product has its own name and its own address now. tentmaiker.com serves
 * the product; stewardship.capital keeps serving the company's own site, and
 * nothing about it changes here.
 *
 * Only the addresses move. The product is still implemented under /spark, and
 * a request to the product domain is rewritten onto those paths rather than
 * reorganised into new ones: a rewrite is a change of address, while moving
 * every route would be a change of code, and the two do not need to happen on
 * the same day. /spark keeps answering on the product domain too, so nothing
 * that was already working stops.
 */

const PRODUCT_HOSTS = new Set(["tentmaiker.com", "www.tentmaiker.com"]);

/** The product's own origin, for links that have to be absolute. */
export const PRODUCT_ORIGIN = "https://tentmaiker.com";

/** The company's, for the surfaces that stayed hers. */
export const COMPANY_ORIGIN = "https://stewardship.capital";

/**
 * The platform console is Stewardship.Capital's own, not the product's: it is
 * where the company administers every engagement, including ones that run on
 * no product at all. It answers on the company's domain only.
 */
export const isCompanyOwnedPath = (pathname: string): boolean =>
  pathname === PLATFORM_HOME || pathname.startsWith(`${PLATFORM_HOME}/`);

/**
 * Whether this request arrived at the product's domain rather than the
 * company's.
 *
 * Behind a proxy the address somebody typed arrives as x-forwarded-host, and
 * the host header is whatever the proxy dialled. Callers pass the forwarded
 * one first for that reason.
 */
export const isProductHost = (host: string | null | undefined): boolean => {
  if (!host) return false;
  const name = hostName(host);
  if (PRODUCT_HOSTS.has(name)) return true;
  /* Preview deployments of the product domain, which Vercel names per branch. */
  return name.endsWith(".tentmaiker.com");
};

/**
 * The company's public page, at the root of the product's domain.
 *
 * tentmaiker.com/ is TentMAiKER's own front page, not the product's. The
 * product's front door is /spark, its original address, which answers on this
 * domain as it does everywhere. The page lives at an internal path so that no
 * shared route has to know which domain it is on; nobody links to the path.
 */
export const LANDING_PATH = "/tentmaiker";

/** The company's own domain, where the landing page's internal path is not served. */
const COMPANY_HOSTS = new Set(["stewardship.capital", "www.stewardship.capital"]);

const hostName = (host: string | null | undefined) =>
  (host ?? "").split(":")[0].trim().toLowerCase();

export const isCompanyHost = (host: string | null | undefined): boolean =>
  COMPANY_HOSTS.has(hostName(host));

export const isLandingPath = (pathname: string): boolean =>
  pathname === LANDING_PATH || pathname.startsWith(`${LANDING_PATH}/`);

/**
 * The clean addresses the product answers to on its own domain, and the paths
 * inside the application that actually serve them.
 *
 * The root is the landing page. Everything else keeps the shape it already
 * had, one segment shorter; /spark itself needs no translation.
 */
const CLEAN_PREFIXES: Array<[string, string]> = [
  ["/c", `${SPARK_BASE}/c`],
  ["/i", `${SPARK_BASE}/i`],
  ["/auth", `${SPARK_BASE}/auth`],
  ["/signout", `${SPARK_BASE}/signout`],
];

/**
 * The path inside the application that serves this clean address, or null when
 * the address is already an application path and needs no translation.
 */
export const productPath = (pathname: string): string | null => {
  if (pathname === "/" || pathname === "") return LANDING_PATH;
  for (const [clean, internal] of CLEAN_PREFIXES) {
    if (pathname === clean) return internal;
    if (pathname.startsWith(`${clean}/`)) return `${internal}${pathname.slice(clean.length)}`;
  }
  return null;
};

/** The clean address for an application path, for links on the product domain. */
export const cleanPath = (pathname: string): string => {
  for (const [clean, internal] of CLEAN_PREFIXES) {
    if (pathname === internal) return clean;
    if (pathname.startsWith(`${internal}/`)) return `${clean}${pathname.slice(internal.length)}`;
  }
  return pathname;
};

/**
 * Stewardship.Capital's own surfaces, which the product domain does not serve.
 *
 * The company's homepage, the preserved financial platform and its password
 * sign in belong to the company, not to the product. On tentmaiker.com they
 * are sent to the product's front door rather than rendered: somebody who
 * types the wrong address should find the product, not another company's site.
 */
const SITE_ONLY = ["/dashboard", "/login", "/signup", "/assessment", "/internal"];

export const isSiteOnlyPath = (pathname: string): boolean =>
  SITE_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
