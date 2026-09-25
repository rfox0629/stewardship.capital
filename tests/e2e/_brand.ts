/* Scratch: an empty workspace, purely to look at the navigation's links. */
import { writeFileSync } from "node:fs";
import { admin, createIdentity, linkFor, RUN } from "./harness.ts";
const out = process.argv[2];
const strip = (row: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));
const { data: shine } = await admin.from("engagements").select("*")
  .eq("series_slug", "founders-weekend").eq("edition_label", "2026")
  .eq("organization_id", (await admin.from("organizations").select("id").eq("slug", "shine").single()).data!.id)
  .single();
const slug = `${RUN}-brand`;
const { data: org } = await admin.from("organizations").insert({ slug, name: "Brand Check" }).select("id").single();
const { data: eng } = await admin.from("engagements").insert({
  ...strip(shine!, ["id", "organization_id", "slug", "created_at", "updated_at"]),
  organization_id: org!.id, slug: `brand-${RUN}`, series_slug: "brand", edition_label: "2026",
  name: "Brand Check 2026",
}).select("id").single();
const who = await createIdentity("brand");
await admin.from("workspace_members").insert({ engagement_id: eng!.id, user_id: who.id, role: "planner" });
const { tokenHash } = await linkFor(who.email);
writeFileSync(out, JSON.stringify({ orgId: org!.id, userId: who.id, clean: `/c/${slug}/e/brand/2026` }));
console.log("clean", `/c/${slug}/e/brand/2026`);
console.log("token", tokenHash);
