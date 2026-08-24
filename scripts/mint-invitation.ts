import { createClient } from "@supabase/supabase-js";

import { hashInvitationToken, randomInvitationToken } from "../lib/spark/tokens.ts";
import { SPARK_ROLES, type SparkRole } from "../lib/spark/types.ts";

/**
 * Mints an invitation.
 *
 *   npm run spark:invite -- sam@shine.co shine founders-weekend-2026 client
 *
 * The raw token is printed once, here, and never stored. What goes into the
 * database is its hash, so this output is the only copy that will ever exist
 * and losing it means minting a new one rather than looking the old one up.
 */

const [email, clientSlug, engagementSlug, role, days] = process.argv.slice(2);

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

if (!email || !clientSlug || !engagementSlug || !role) {
  fail(
    "usage: npm run spark:invite -- <email> <client-slug> <engagement-slug> <planner|client|stakeholder> [days]",
  );
}

if (!SPARK_ROLES.includes(role as SparkRole)) {
  fail(`role must be one of: ${SPARK_ROLES.join(", ")}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

const admin = createClient(url!, serviceRole!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: organization } = await admin
  .from("organizations")
  .select("id, name")
  .eq("slug", clientSlug)
  .maybeSingle();

if (!organization) fail(`unknown client: ${clientSlug}`);

const { data: engagement } = await admin
  .from("engagements")
  .select("id, name")
  .eq("organization_id", organization!.id)
  .eq("slug", engagementSlug)
  .maybeSingle();

if (!engagement) fail(`unknown engagement: ${clientSlug}/${engagementSlug}`);

const token = randomInvitationToken();
const ttlDays = Number(days ?? 14);
const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

const { error } = await admin.from("invitations").insert({
  engagement_id: engagement!.id,
  email: email.trim().toLowerCase(),
  role,
  token_hash: await hashInvitationToken(token),
  expires_at: expiresAt.toISOString(),
});

if (error) fail(`could not create invitation: ${error.message}`);

console.log("");
console.log(`  ${organization!.name} / ${engagement!.name}`);
console.log(`  ${email.trim().toLowerCase()} as ${role}`);
console.log(`  expires ${expiresAt.toISOString()}`);
console.log("");
console.log(`  /spark/i/${token}`);
console.log("");
console.log("  Printed once. Only the hash is stored.");
console.log("");
