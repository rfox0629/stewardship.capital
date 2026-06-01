"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const redirectTo = getString(formData, "redirectTo") || "/dashboard";

  if (!email || !password) {
    redirectWithError("/login", "Enter your email and password.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirectWithError("/login", error.message);
    }
  } catch (error) {
    redirectWithError(
      "/login",
      error instanceof Error ? error.message : "Unable to log in.",
    );
  }

  revalidatePath("/", "layout");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signup(formData: FormData) {
  const fullName = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!fullName || !email || !password) {
    redirectWithError("/signup", "Enter your name, email, and password.");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      redirectWithError("/signup", error.message);
    }

    revalidatePath("/", "layout");

    if (data.session) {
      redirect("/assessment");
    }
  } catch (error) {
    redirectWithError(
      "/signup",
      error instanceof Error ? error.message : "Unable to create account.",
    );
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Account created. Check your email if confirmation is required, then log in.",
    )}`,
  );
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Missing credentials or expired sessions should still return to login.
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
