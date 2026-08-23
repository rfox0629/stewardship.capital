"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { EVENTS_OS_BASE } from "./paths";
import { VIEWER_COOKIE, isViewerRole } from "./viewer";
import type { ViewerRole } from "./viewer";

/**
 * Reading and writing the lens.
 *
 * Split from `viewer.ts` because the model itself has to be importable from
 * client components, and `next/headers` cannot cross that boundary. The model
 * is shared, the storage is not.
 *
 * In the shipped product the lens is not a cookie. It is whoever signed in.
 * This exists so the founder preview can walk the same event three ways.
 */
export async function readViewer(): Promise<ViewerRole> {
  const store = await cookies();
  const value = store.get(VIEWER_COOKIE)?.value;
  return isViewerRole(value) ? value : "planner";
}

export async function setViewer(role: ViewerRole): Promise<void> {
  if (!isViewerRole(role)) return;

  const store = await cookies();
  store.set(VIEWER_COOKIE, role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  revalidatePath(EVENTS_OS_BASE || "/", "layout");
}
