import { Effect, ManagedRuntime } from "effect"
import { describe, expect, it } from "vitest"
import { clientAddress, RateLimit, RateLimited } from "~/server/rate-limit"

const runtime = ManagedRuntime.make(RateLimit.layer)

const hit = (key: string, limit: number, windowMs: number) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const rl = yield* RateLimit
      return yield* rl.hit(key, limit, windowMs).pipe(
        Effect.as("ok" as const),
        Effect.catchTag("RateLimited", (e) => Effect.succeed(e)),
      )
    }),
  )

describe("RateLimit", () => {
  it("allows up to the limit, then rejects with a retry hint", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(hit("a:1", 3, 60_000)).resolves.toBe("ok")
    }
    const rejected = await hit("a:1", 3, 60_000)
    expect(rejected).toBeInstanceOf(RateLimited)
    expect((rejected as RateLimited).retryAfterMs).toBeGreaterThan(0)
  })

  it("keys are independent", async () => {
    await expect(hit("b:1", 1, 60_000)).resolves.toBe("ok")
    await expect(hit("b:2", 1, 60_000)).resolves.toBe("ok")
    expect(await hit("b:1", 1, 60_000)).toBeInstanceOf(RateLimited)
  })

  it("window slides: old hits expire", async () => {
    await expect(hit("c:1", 1, 50)).resolves.toBe("ok")
    expect(await hit("c:1", 1, 50)).toBeInstanceOf(RateLimited)
    await new Promise((r) => setTimeout(r, 60))
    await expect(hit("c:1", 1, 50)).resolves.toBe("ok")
  })
})

describe("clientAddress", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const req = new Request("http://x/", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    })
    expect(clientAddress(req)).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientAddress(new Request("http://x/", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9")
    expect(clientAddress(new Request("http://x/"))).toBe("unknown")
  })
})
