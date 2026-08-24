import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { sparkCookieOptions } from "./cookie-options";
import { getSupabaseEnv } from "./env";

/**
 * The Supabase client for the proxy, bound to this request and its response.
 *
 * Creating it is also what keeps people signed in. Reading the session here
 * rotates the refresh token and writes the refreshed pair back onto the
 * response, so an ordinary visit renews the session and someone who uses Spark
 * on their phone every few days is never asked to verify again.
 *
 * The response is held in a box because @supabase/ssr replaces it when it
 * writes cookies, and the caller needs whichever one ended up carrying them.
 */
export type ProxyClient = {
  supabase: ReturnType<typeof createServerClient> | null;
  box: { response: NextResponse };
};

export function createProxyClient(request: NextRequest): ProxyClient {
  const box = { response: NextResponse.next({ request }) };
  const env = getSupabaseEnv();

  if (!env) return { supabase: null, box };

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookieOptions: sparkCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        box.response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          box.response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, box };
}

/** Whether this request carries a currently valid Supabase identity. */
export async function hasIdentity(
  supabase: ReturnType<typeof createServerClient> | null,
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    return Boolean(data?.claims && !error);
  } catch {
    return false;
  }
}
