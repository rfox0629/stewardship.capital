/**
 * Every link in the Stewardship Events operating system is built here.
 *
 * To move this application to its own domain, for example
 * app.stewardshipevents.com, set EVENTS_OS_BASE to "" and move the
 * `app/events-os` folder to the root of the new application. No screen, no
 * component, and no data file needs to change.
 */
export const EVENTS_OS_BASE = "/events-os";

const join = (segments: Array<string | number>) => {
  const path = segments
    .filter((segment) => segment !== "" && segment !== undefined)
    .join("/");
  return `${EVENTS_OS_BASE}/${path}`.replace(/\/+$/, "") || "/";
};

export const plannerPath = () => EVENTS_OS_BASE || "/";

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
