/**
 * Request limits that hold across every server instance.
 *
 * Anything that sends an email because a stranger asked (a sign in code, an
 * invitation's code, a website inquiry) is metered here. The counters live in
 * Postgres (public.take_request_slot), so the limit is the same whichever
 * serverless instance answers. Keys are hashed before they leave the process:
 * no address, email or IP is stored.
 *
 * If the shared counter cannot be reached, the limiter falls back to a counter
 * in this instance's memory rather than to no limit at all. That is weaker,
 * because each instance counts on its own, and it is logged, but it is never
 * nothing.
 */

export type ThrottleStore = {
  take: (bucket: string, keyHash: string, limit: number, windowSeconds: number) => Promise<boolean>;
};

export type Rule = {
  /** Short, stable name for what is being counted, e.g. "code:ip". */
  bucket: string;
  /** The thing counted: an address, an IP. Hashed before it is used. */
  key: string;
  limit: number;
  windowSeconds: number;
};

export const hashKey = async (bucket: string, key: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${bucket}\u0000${key.trim().toLowerCase()}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/** A per-instance counter. The fallback, and what the unit tests drive. */
export const memoryStore = (now: () => number = Date.now): ThrottleStore => {
  const counts = new Map<string, number>();
  return {
    async take(bucket, keyHash, limit, windowSeconds) {
      const window = Math.floor(now() / 1000 / windowSeconds);
      const id = `${bucket}|${keyHash}|${window}`;
      const hits = (counts.get(id) ?? 0) + 1;
      counts.set(id, hits);
      if (counts.size > 5000) {
        for (const key of counts.keys()) {
          if (!key.endsWith(`|${window}`)) counts.delete(key);
        }
      }
      return hits <= limit;
    },
  };
};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** The shared counter, through the service role. */
export const databaseStore = (client: RpcClient): ThrottleStore => ({
  async take(bucket, keyHash, limit, windowSeconds) {
    const { data, error } = await client.rpc("take_request_slot", {
      p_bucket: bucket,
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw new Error(error.message);
    return data === true;
  },
});

/**
 * Checks every rule, counting each one, and allows the request only if all of
 * them allow it. Every rule is counted even after one refuses, so hammering on
 * one key keeps spending that key's budget rather than resetting it.
 */
export const createLimiter = (primary: ThrottleStore | null, fallback: ThrottleStore) => {
  let warned = false;
  return async (rules: Rule[]): Promise<boolean> => {
    let allowed = true;
    for (const rule of rules) {
      const keyHash = await hashKey(rule.bucket, rule.key);
      let ok: boolean;
      try {
        if (!primary) throw new Error("no shared store configured");
        ok = await primary.take(rule.bucket, keyHash, rule.limit, rule.windowSeconds);
      } catch (error) {
        if (!warned) {
          warned = true;
          console.warn(
            "throttle: shared counter unavailable, limiting per instance:",
            error instanceof Error ? error.message : String(error),
          );
        }
        ok = await fallback.take(rule.bucket, keyHash, rule.limit, rule.windowSeconds);
      }
      if (!ok) allowed = false;
    }
    return allowed;
  };
};

/**
 * The address a request came from, as the platform reports it.
 *
 * On Vercel, x-vercel-forwarded-for and x-real-ip are set by the edge and
 * cannot be supplied by the client; x-forwarded-for is the fallback for other
 * hosts and local runs.
 */
export const clientAddress = (headers: { get: (name: string) => string | null }): string =>
  headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
  headers.get("x-real-ip")?.trim() ||
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";
