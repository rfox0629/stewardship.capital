/**
 * Runtime configuration for Spark authentication.
 *
 * The one rule this file exists to enforce: production never authenticates
 * with a known development secret. It fails to start the flow instead.
 */

export class SparkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SparkConfigError";
  }
}

const DEV_SECRET =
  "spark-development-secret-not-for-production-do-not-deploy-this";

const MIN_SECRET_LENGTH = 32;

/**
 * A Vercel preview reports NODE_ENV=production, so NODE_ENV alone cannot tell
 * production from preview. VERCEL_ENV can, and is preferred when present.
 */
export const isProductionRuntime = (env: NodeJS.ProcessEnv = process.env) =>
  env.VERCEL_ENV === "production" ||
  (env.NODE_ENV === "production" && !env.VERCEL_ENV);

/**
 * The signing secret, or a refusal.
 *
 * Throws in production when the secret is missing or too short, so a
 * misconfigured deploy fails closed rather than signing sessions everyone
 * already knows the key to.
 */
export const sessionSecret = (env: NodeJS.ProcessEnv = process.env): string => {
  const configured = env.SPARK_SESSION_SECRET?.trim();

  if (configured) {
    if (configured.length < MIN_SECRET_LENGTH) {
      throw new SparkConfigError(
        `SPARK_SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
      );
    }
    return configured;
  }

  if (isProductionRuntime(env)) {
    throw new SparkConfigError(
      "SPARK_SESSION_SECRET is required in production. Refusing to sign sessions with the development secret.",
    );
  }

  return DEV_SECRET;
};

export const sessionSecretConfigured = (
  env: NodeJS.ProcessEnv = process.env,
) => Boolean(env.SPARK_SESSION_SECRET?.trim());

export const DEVELOPMENT_SECRET = DEV_SECRET;
export const MINIMUM_SECRET_LENGTH = MIN_SECRET_LENGTH;
