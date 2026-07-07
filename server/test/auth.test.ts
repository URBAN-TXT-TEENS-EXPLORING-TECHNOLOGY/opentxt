import { Effect, ManagedRuntime } from "effect"
import { beforeAll, describe, expect, it } from "vitest"

process.env["AUTH_SECRET"] = "test-secret-do-not-use-in-prod"

import { Auth } from "~/server/auth"

const runtime = ManagedRuntime.make(Auth.layer)

const withAuth = <A>(f: (auth: Auth["Service"]) => Effect.Effect<A, unknown>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* f(svc)
    }),
  )

describe("Auth", () => {
  let stored: string

  beforeAll(async () => {
    stored = await withAuth((auth) => auth.hashPassword("correct horse battery"))
  })

  it("hashes with a random salt (two hashes of the same password differ)", async () => {
    const second = await withAuth((auth) => auth.hashPassword("correct horse battery"))
    expect(second).not.toBe(stored)
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/)
  })

  it("verifies the right password and rejects the wrong one", async () => {
    await expect(
      withAuth((auth) => auth.verifyPassword("correct horse battery", stored)),
    ).resolves.toBe(true)
    await expect(
      withAuth((auth) => auth.verifyPassword("wrong password", stored)),
    ).resolves.toBe(false)
    await expect(withAuth((auth) => auth.verifyPassword("x", "garbage"))).resolves.toBe(false)
  })

  it("round-trips a token through requireUser", async () => {
    const user = { userId: "u-1", email: "a@b.c" }
    const token = await withAuth((auth) => auth.signToken(user))
    const request = new Request("http://x/", {
      headers: { Authorization: `Bearer ${token}` },
    })
    await expect(withAuth((auth) => auth.requireUser(request))).resolves.toEqual(user)
  })

  it("rejects missing and tampered tokens", async () => {
    const bare = new Request("http://x/")
    await expect(withAuth((auth) => auth.requireUser(bare))).rejects.toThrow()
    const tampered = new Request("http://x/", {
      headers: { Authorization: "Bearer abc.def.ghi" },
    })
    await expect(withAuth((auth) => auth.requireUser(tampered))).rejects.toThrow()
  })
})
