"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  invitationByToken,
  membershipsFor,
  roleFor,
  workspaceById,
  workspacePath,
} from "../../../lib/spark/directory";
import {
  PENDING_COOKIE,
  PENDING_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VIEWER_COOKIE,
  readPending,
  sealPending,
  sealSession,
} from "../../../lib/spark/session";
import type { AccessResult, SparkRole } from "../../../lib/spark/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function establish(email: string, workspaceId: string, role: SparkRole) {
  const workspace = workspaceById(workspaceId);
  if (!workspace) redirect("/more");

  const store = await cookies();
  store.set(SESSION_COOKIE, await sealSession(email, workspaceId, role), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });

  /* The operating system reads the lens from this cookie. Setting it here is
     what makes signing in, rather than a preview toggle, decide what a person
     sees inside the workspace. */
  store.set(VIEWER_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });

  store.delete(PENDING_COOKIE);
  redirect(workspacePath(workspace));
}

/**
 * Step one. Decides whether this address has any way in at all.
 *
 * The browser only ever learns about the address that was typed. There is no
 * call that returns the list of clients or workspaces.
 */
export async function checkAccess(email: string): Promise<AccessResult> {
  if (!EMAIL.test(email.trim())) return { status: "unauthorized" };

  const memberships = membershipsFor(email);
  if (memberships.length === 0) return { status: "unauthorized" };

  if (memberships.length === 1) {
    await establish(email, memberships[0].workspaceId, memberships[0].role);
  }

  /* More than one. Remember who is asking, server side, so the next step does
     not have to take the browser's word for the identity. */
  const store = await cookies();
  store.set(PENDING_COOKIE, await sealPending(email), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_MAX_AGE,
  });

  return {
    status: "choose",
    workspaces: memberships.flatMap((membership) => {
      const workspace = workspaceById(membership.workspaceId);
      return workspace
        ? [{ id: workspace.id, client: workspace.client, label: workspace.label }]
        : [];
    }),
  };
}

/** Step two, for people who belong to more than one. */
export async function chooseWorkspace(workspaceId: string): Promise<void> {
  const store = await cookies();
  const email = await readPending(store.get(PENDING_COOKIE)?.value);
  if (!email) redirect("/more");

  const role = roleFor(email, workspaceId);
  if (!role) redirect("/more");

  await establish(email, workspaceId, role);
}

/**
 * An invitation link. Takes an invited person straight through into the
 * workspace they were invited to.
 *
 * Possession of the token is the only check. Real tokens have to be
 * unguessable, single use, and expiring before this is worth anything; the
 * seeded one is none of those.
 */
export async function redeemInvitation(token: string): Promise<void> {
  const invitation = invitationByToken(token);
  if (!invitation) redirect("/more");

  await establish(invitation.email, invitation.workspaceId, invitation.role);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(VIEWER_COOKIE);
  store.delete(PENDING_COOKIE);
  redirect("/more");
}
