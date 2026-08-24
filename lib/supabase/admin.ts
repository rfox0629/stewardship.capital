import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The service role client. Bypasses row level security entirely.
 *
 * Used for exactly one thing in the request path: finding an invitation by the
 * hash of its token, before anyone is signed in. That lookup cannot be done
 * under RLS, because the person following the link has no session yet, and
 * making invitations readable to anonymous callers would turn the table into
 * an enumeration surface.
 *
 * It is never used to decide access. Acceptance runs under the person's own
 * session, so the database is what enforces that the address matches.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
