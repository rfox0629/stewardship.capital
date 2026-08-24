"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SparkConfigError, sessionSecret } from "../../../lib/spark/config";
import {
  membershipsFor,
  roleFor,
  workspaceById,
  workspacePath,
} from "../../../lib/spark/directory";
import { acceptInvitation } from "../../../lib/spark/invitations";
import { consumedInvitations } from "../../../lib/spark/invitation-store";
import { MailerNotConfiguredError, sendVerificationCode } from "../../../lib/spark/mailer";
import { maskEmail } from "../../../lib/spark/mask";
import {
  CHALLENGE_COOKIE,
  CHALLENGE_MAX_AGE,
  PENDING_COOKIE,
  PENDING_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VIEWER_COOKIE,
  readVerified,
  sealSession,
  sealVerified,
} from "../../../lib/spark/session";
import {
  issueChallenge,
  readChallenge,
  sealChallenge,
  verifyChallenge,
} from "../../../lib/spark/verification";
import type { SparkRole } from "../../../lib/spark/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RequestOutcome =
  | { status: "unauthorized" }
  | { status: "sent"; hint: string }
  | { status: "undeliverable" };

export type VerifyOutcome =
  | { status: "invalid" }
  | { status: "restart" }
  | {
      status: "choose";
      workspaces: Array<{ id: string; client: string; label: string }>;
    };

const secure = () => process.env.NODE_ENV === "production";

async function establish(email: string, workspaceId: string, role: SparkRole) {
  const workspace = workspaceById(workspaceId);
  if (!workspace) redirect("/more");

  const secret = sessionSecret();
  const store = await cookies();

  store.set(SESSION_COOKIE, await sealSession(email, workspaceId, role, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    maxAge: SESSION_MAX_AGE,
  });

  /* The operating system reads the lens from this cookie, so what a person
     sees follows from who signed in rather than from a preview toggle. */
  store.set(VIEWER_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });

  store.delete(CHALLENGE_COOKIE);
  store.delete(PENDING_COOKIE);
  redirect(workspacePath(workspace));
}

/**
 * Step one. Sends a code to an address that already has standing access.
 *
 * Knowing the address is not enough to get in: all this does is post a code to
 * it. Nothing about the session is decided here.
 */
export async function requestCode(email: string): Promise<RequestOutcome> {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address)) return { status: "unauthorized" };
  if (membershipsFor(address).length === 0) return { status: "unauthorized" };

  const secret = sessionSecret();
  const { challenge, code } = await issueChallenge(address, secret);

  try {
    await sendVerificationCode(address, code);
  } catch (error) {
    if (error instanceof MailerNotConfiguredError) return { status: "undeliverable" };
    throw error;
  }

  const store = await cookies();
  store.set(CHALLENGE_COOKIE, await sealChallenge(challenge, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    maxAge: CHALLENGE_MAX_AGE,
  });

  return { status: "sent", hint: maskEmail(address) };
}

/**
 * Step two. The code proves the person asking reads the address the challenge
 * was issued to. The identity comes from the signed challenge, never from the
 * form.
 */
export async function verifyCode(code: string): Promise<VerifyOutcome> {
  const secret = sessionSecret();
  const store = await cookies();

  const challenge = await readChallenge(store.get(CHALLENGE_COOKIE)?.value, secret);
  const outcome = await verifyChallenge(challenge, code, secret);

  if (!outcome.ok) {
    if (outcome.challenge) {
      /* Record the failed attempt so a challenge cannot be hammered forever. */
      store.set(CHALLENGE_COOKIE, await sealChallenge(outcome.challenge, secret), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: secure(),
        maxAge: CHALLENGE_MAX_AGE,
      });
      return { status: "invalid" };
    }
    store.delete(CHALLENGE_COOKIE);
    return { status: "restart" };
  }

  /* An invited person is granted the workspace the invitation named, and the
     invitation is burned so the link cannot be accepted twice. */
  if (outcome.invitation) {
    const accepted = await acceptInvitation(
      {
        jti: outcome.invitation.jti,
        email: outcome.email,
        workspaceId: outcome.invitation.workspaceId,
        role: outcome.invitation.role,
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      consumedInvitations,
    );

    if (!accepted.ok) {
      store.delete(CHALLENGE_COOKIE);
      return { status: "restart" };
    }

    await establish(
      outcome.email,
      outcome.invitation.workspaceId,
      outcome.invitation.role,
    );
  }

  const memberships = membershipsFor(outcome.email);
  if (memberships.length === 0) {
    store.delete(CHALLENGE_COOKIE);
    return { status: "restart" };
  }

  if (memberships.length === 1) {
    await establish(outcome.email, memberships[0].workspaceId, memberships[0].role);
  }

  store.delete(CHALLENGE_COOKIE);
  store.set(PENDING_COOKIE, await sealVerified(outcome.email, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
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

/** Step three, only for people who belong to more than one. */
export async function chooseWorkspace(workspaceId: string): Promise<void> {
  const secret = sessionSecret();
  const store = await cookies();

  const email = await readVerified(store.get(PENDING_COOKIE)?.value, secret);
  if (!email) redirect("/more");

  const role = roleFor(email, workspaceId);
  if (!role) redirect("/more");

  await establish(email, workspaceId, role);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  [SESSION_COOKIE, VIEWER_COOKIE, PENDING_COOKIE, CHALLENGE_COOKIE].forEach(
    (name) => store.delete(name),
  );
  redirect("/more");
}

export { SparkConfigError };
