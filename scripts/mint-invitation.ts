import { sessionSecret } from "../lib/spark/config.ts";
import { workspaceById } from "../lib/spark/directory.ts";
import { mintInvitation } from "../lib/spark/invitations.ts";
import type { SparkRole } from "../lib/spark/types.ts";

/**
 * Mints an invitation.
 *
 *   npm run spark:invite -- sam@shine.co shine-founders-weekend-2026 client
 *
 * Signed with SPARK_SESSION_SECRET, so a token minted here is valid on any
 * instance that shares the secret. Print it, send it, and it stops working
 * once accepted or once it expires.
 */
const ROLES: SparkRole[] = ["planner", "client", "stakeholder"];

const [email, workspaceId, role] = process.argv.slice(2);

if (!email || !workspaceId || !role) {
  console.error(
    "usage: npm run spark:invite -- <email> <workspaceId> <planner|client|stakeholder>",
  );
  process.exit(1);
}

if (!ROLES.includes(role as SparkRole)) {
  console.error(`role must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const workspace = workspaceById(workspaceId);
if (!workspace) {
  console.error(`unknown workspace: ${workspaceId}`);
  process.exit(1);
}

const { token, claims } = await mintInvitation(
  { email, workspaceId, role: role as SparkRole },
  sessionSecret(),
);

console.log("");
console.log(`  ${workspace.client} / ${workspace.label}`);
console.log(`  ${claims.email} as ${claims.role}`);
console.log(`  expires ${new Date(claims.exp * 1000).toISOString()}`);
console.log("");
console.log(`  /i/${token}`);
console.log("");
