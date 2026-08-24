import { isProductionRuntime } from "./config.ts";

/**
 * Delivering the one time code.
 *
 * Resend over its REST API, so there is no new dependency. Outside production,
 * an unconfigured mailer writes the code to the server log instead, which
 * keeps local development and a protected preview workable without ever
 * returning the code to the browser.
 *
 * In production an unconfigured mailer is an error rather than a fallback.
 * Silently logging a code in production would be worse than failing.
 */

export class MailerNotConfiguredError extends Error {
  constructor() {
    super("RESEND_API_KEY is required to deliver verification codes.");
    this.name = "MailerNotConfiguredError";
  }
}

export type Delivery = "email" | "server-log";

const FROM_FALLBACK = "Spark <spark@stewardship.capital>";

export const sendVerificationCode = async (
  email: string,
  code: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Delivery> => {
  const apiKey = env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (isProductionRuntime(env)) throw new MailerNotConfiguredError();
    /* Never returned to the caller's response. The server log is the only
       place this appears. */
    console.info(`[spark] verification code for ${email}: ${code}`);
    return "server-log";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.SPARK_MAIL_FROM?.trim() || FROM_FALLBACK,
      to: [email],
      subject: `${code} is your Spark code`,
      text: [
        `${code}`,
        "",
        "Enter this code to sign in to Spark.",
        "It expires in ten minutes and can be used once.",
        "",
        "If you did not ask for it, nothing happened and you can ignore this.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend refused the verification email: ${response.status}`,
    );
  }

  return "email";
};
