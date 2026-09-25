import { headers } from "next/headers";

import { cleanPath, isProductHost } from "./hosts.ts";

/**
 * The public form of an application path, for the domain being asked.
 *
 * Inside the code a workspace is /spark/c/..., and it stays that way: the
 * routes, the cache paths and the guard all speak that language. What a
 * person sees should be the address they were given, so every link a page
 * renders goes through here and comes back clean on the product's own domain
 * and unchanged on the company's.
 *
 * Server side on purpose. The host is a property of the request, so a link is
 * worked out where the request is, and handed to the components that draw it.
 */
export const publicPath = async (path: string): Promise<string> => {
  const bag = await headers();
  const host = bag.get("x-forwarded-host") ?? bag.get("host");
  return isProductHost(host) ? cleanPath(path) : path;
};

/** Whether this request came to the product's own domain. */
export const onProductDomain = async (): Promise<boolean> => {
  const bag = await headers();
  return isProductHost(bag.get("x-forwarded-host") ?? bag.get("host"));
};
