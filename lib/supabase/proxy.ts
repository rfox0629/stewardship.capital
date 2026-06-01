import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

const protectedPathPrefixes = ["/dashboard"];
const authPathPrefixes = ["/login", "/signup"];

function isPathMatch(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);

  if (reason) {
    redirectUrl.searchParams.set("message", reason);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = isPathMatch(pathname, protectedPathPrefixes);
  const isAuthPath = isPathMatch(pathname, authPathPrefixes);
  const env = getSupabaseEnv();

  if (!env) {
    if (isProtectedPath) {
      return redirectToLogin(request, "Supabase credentials are not configured.");
    }

    return response;
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  const isAuthenticated = Boolean(data?.claims && !error);

  if (isProtectedPath && !isAuthenticated) {
    return redirectToLogin(request);
  }

  if (isAuthPath && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
