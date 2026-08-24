/**
 * The two short lived cookies Spark sets for itself.
 *
 * Neither is a credential and neither is signed, because neither grants
 * anything. They only carry which conversation this browser is in the middle
 * of. Everything that decides access is either the Supabase session or a
 * database row.
 *
 *   spark_otp     the address a code was just sent to. Forging it means
 *                 claiming an address you then still have to prove you read.
 *   spark_invite  the hash of an invitation being accepted. Knowing a hash is
 *                 not knowing a token, and acceptance still requires the
 *                 signed in address to match the invited one.
 *
 * Deliberately absent: any cookie that says who someone is or what they may
 * reach. Spark had one of those. Supabase Auth replaced it.
 */
export const OTP_EMAIL_COOKIE = "spark_otp";
export const INVITE_COOKIE = "spark_invite";

export const OTP_MAX_AGE = 60 * 15;
export const INVITE_MAX_AGE = 60 * 30;

export type TransientCookie = {
  path: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
};

export const transientCookie = (maxAge: number): TransientCookie => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge,
});
