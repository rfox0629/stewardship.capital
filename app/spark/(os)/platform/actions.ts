"use server";

import { revalidatePath } from "next/cache";

import { resolveAccess } from "@lib/spark/access";
import { hashInvitationToken, randomInvitationToken } from "@lib/spark/tokens";
import { isSparkRole } from "@lib/spark/types";
import { createClient } from "../../../../lib/supabase/server";

/**
 * Everything Stewardship.Capital staff may do to operate Spark.
 *
 * Every action re-resolves access on its own request and refuses anyone
 * without the explicit platform_staff grant, then performs the change under
 * that person's own session, so RLS has the final word and the audit trigger
 * records who acted. The service role appears nowhere in this file.
 *
 * Outcomes are uniform. A failed action says it failed and no more, because
 * this surface must not become an oracle for what exists.
 */

type Outcome = { ok: boolean; message?: string };

const PLATFORM = "/spark/platform";
const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

const staffSession = async () => {
  const supabase = await createClient().catch(() => null);
  if (!supabase) return null;
  const access = await resolveAccess(supabase);
  if (!access?.staff) return null;
  return supabase;
};

export async function createOrganization(formData: FormData): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || !SLUG.test(slug)) {
    return { ok: false, message: "A name, and a slug of lowercase letters, digits, and dashes." };
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ slug, name })
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return { ok: false, message: "That did not save. The slug may already be taken." };
  }

  revalidatePath(PLATFORM);
  return { ok: true };
}

export async function createEngagement(formData: FormData): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const seriesSlug = String(formData.get("seriesSlug") ?? "").trim().toLowerCase();
  const editionLabel = String(formData.get("editionLabel") ?? "").trim().toLowerCase();
  const startsOn = String(formData.get("startsOn") ?? "") || null;
  const endsOn = String(formData.get("endsOn") ?? "") || null;
  const location = String(formData.get("location") ?? "").trim().slice(0, 120) || null;

  if (!organizationId || !name || !SLUG.test(seriesSlug) || !SLUG.test(editionLabel)) {
    return {
      ok: false,
      message: "A name, a series slug, and an edition. Slugs are lowercase letters, digits, and dashes.",
    };
  }

  const { data, error } = await supabase
    .from("engagements")
    .insert({
      organization_id: organizationId,
      slug: `${seriesSlug}-${editionLabel}`,
      name,
      series_slug: seriesSlug,
      edition_label: editionLabel,
      starts_on: startsOn,
      ends_on: endsOn,
      location,
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) {
    return {
      ok: false,
      message: "That did not save. The series and edition may already exist for this client.",
    };
  }

  revalidatePath(PLATFORM);
  return { ok: true };
}

export async function setMemberRole(
  engagementId: string,
  userId: string,
  role: string,
): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };
  if (!isSparkRole(role)) return { ok: false };

  /* An engagement must keep a planner. Demoting the last one would leave the
     roster manageable by nobody but staff, silently; refusing is louder. */
  if (role !== "planner") {
    const { data: roster } = await supabase.rpc("engagement_roster", {
      target: engagementId,
    });
    const planners = (roster ?? []).filter(
      (member: { role: string }) => member.role === "planner",
    );
    if (planners.length === 1 && planners[0].user_id === userId) {
      return { ok: false, message: "That is the only planner. Name another planner first." };
    }
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("engagement_id", engagementId)
    .eq("user_id", userId)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(PLATFORM);
  return { ok: true };
}

export async function removeMember(
  engagementId: string,
  userId: string,
): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const { data: roster } = await supabase.rpc("engagement_roster", {
    target: engagementId,
  });
  const planners = (roster ?? []).filter(
    (member: { role: string }) => member.role === "planner",
  );
  if (planners.length === 1 && planners[0].user_id === userId) {
    return { ok: false, message: "That is the only planner. Name another planner first." };
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("engagement_id", engagementId)
    .eq("user_id", userId)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(PLATFORM);
  return { ok: true };
}

export type InvitationOutcome =
  | { ok: true; link: string; email: string; expires: string }
  | { ok: false; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createInvitation(formData: FormData): Promise<InvitationOutcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const engagementId = String(formData.get("engagementId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const days = Math.min(Math.max(Number(formData.get("days") ?? 14) || 14, 1), 60);

  if (!engagementId || !EMAIL.test(email) || !isSparkRole(role)) {
    return { ok: false, message: "An address, an engagement, and a role." };
  }

  /* The raw token exists only in this request and in the link shown once.
     What the database keeps is its hash, which opens nothing. */
  const token = randomInvitationToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      engagement_id: engagementId,
      email,
      role,
      token_hash: await hashInvitationToken(token),
      expires_at: expiresAt.toISOString(),
    })
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(PLATFORM);
  return {
    ok: true,
    link: `/spark/i/${token}`,
    email,
    expires: expiresAt.toISOString().slice(0, 10),
  };
}

export async function revokeInvitation(invitationId: string): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .is("revoked_at", null)
    .select("id");

  if (error || (data?.length ?? 0) === 0) return { ok: false };

  revalidatePath(PLATFORM);
  return { ok: true };
}

export async function grantStaff(formData: FormData): Promise<Outcome> {
  const supabase = await staffSession();
  if (!supabase) return { ok: false };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false };

  const { data, error } = await supabase.rpc("grant_platform_staff", {
    p_email: email,
  });

  if (error || (data as { ok?: boolean } | null)?.ok !== true) {
    return {
      ok: false,
      message:
        "Not granted. The address must already have signed in to Spark at least once.",
    };
  }

  revalidatePath(PLATFORM);
  return { ok: true };
}
