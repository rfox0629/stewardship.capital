/**
 * Every link inside the Spark operating system is built here.
 *
 * These are the authenticated surfaces. The front door at /spark and the
 * invitation route are addressed from lib/spark/paths.ts, which is the copy
 * the request level guard uses, because the guard must not import anything
 * from the screens it is guarding.
 */
export const SPARK_BASE = "/spark";

const join = (segments: Array<string | number>) => {
  const path = segments
    .filter((segment) => segment !== "" && segment !== undefined)
    .join("/");
  return `${SPARK_BASE}/${path}`.replace(/\/+$/, "") || "/";
};

/**
 * Every client on the platform. Its own path rather than the root of Spark,
 * because the root is the front door everyone arrives at and this is the one
 * surface that requires an explicit cross client grant.
 */
export const plannerPath = () => join(["platform"]);

export const clientPath = (clientSlug: string) => join(["c", clientSlug]);

export const editionPath = (
  clientSlug: string,
  eventSlug: string,
  editionSlug: string,
  ...rest: string[]
) => join(["c", clientSlug, "e", eventSlug, editionSlug, ...rest]);

export type EditionRouteParams = {
  clientSlug: string;
  eventSlug: string;
  edition: string;
};
