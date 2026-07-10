import { Clock, Context, Data, Effect, Layer } from "effect"

/** Mapped to HTTP 429 by routes. `retryAfterMs` feeds the Retry-After header. */
export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly retryAfterMs: number
}> {}

type Bucket = {
  /** Epoch-ms timestamps of recent hits, oldest first. */
  hits: Array<number>
}

/** Sweep threshold: past this many keys, stale buckets are evicted inline. */
const SWEEP_AT = 10_000
/** Largest window any caller uses; hits older than this are dead weight. */
const MAX_WINDOW_MS = 15 * 60_000

/**
 * In-memory sliding-window rate limiter. Single-process by design — this
 * server runs as one node process (node:sqlite is in-process too), so no
 * shared store is needed. No background fiber either: buckets are pruned on
 * every hit, and the whole map is swept inline when it grows past SWEEP_AT
 * keys (bounded memory without fiber-lifetime machinery).
 */
export class RateLimit extends Context.Service<RateLimit>()("opentxt/RateLimit", {
  make: Effect.gen(function* () {
    const buckets = new Map<string, Bucket>()

    const sweep = (now: number): void => {
      for (const [key, bucket] of buckets) {
        if (bucket.hits.length === 0 || (bucket.hits.at(-1) ?? 0) < now - MAX_WINDOW_MS) {
          buckets.delete(key)
        }
      }
    }

    return {
      /**
       * Register a hit for `key`; fail with RateLimited once `limit` hits
       * land inside `windowMs`. Key convention: "<route>:<subject>"
       * (subject = userId when authed, else client IP).
       */
      hit: (
        key: string,
        limit: number,
        windowMs: number,
      ): Effect.Effect<void, RateLimited> =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis
          if (buckets.size > SWEEP_AT) sweep(now)
          const bucket = buckets.get(key) ?? { hits: [] }
          const windowStart = now - windowMs
          bucket.hits = bucket.hits.filter((t) => t > windowStart)
          if (bucket.hits.length >= limit) {
            const oldest = bucket.hits[0] ?? now
            buckets.set(key, bucket)
            return yield* new RateLimited({ retryAfterMs: Math.max(0, oldest + windowMs - now) })
          }
          bucket.hits.push(now)
          buckets.set(key, bucket)
        }),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

/** Best-effort client address for keying UNAUTHENTICATED limits. */
export const clientAddress = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded !== null) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return request.headers.get("x-real-ip") ?? "unknown"
}
