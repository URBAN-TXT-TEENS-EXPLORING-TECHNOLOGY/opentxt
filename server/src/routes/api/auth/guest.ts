import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { randomBytes, randomUUID } from "node:crypto"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { errorJson, json, tooManyRequests } from "~/server/http"
import { clientAddress, RateLimit } from "~/server/rate-limit"
import { runtime } from "~/server/runtime"

/**
 * Guest sign-in: mint a throwaway account + token in one tap, so nobody has
 * to invent an email to try the app. The account is a normal user row with
 * an unguessable local-only address; signing out simply orphans it. The
 * random password is never returned — a guest session can't be re-entered,
 * only replaced.
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const rl = yield* RateLimit
      yield* rl.hit(`guest:${clientAddress(event.request)}`, 5, 15 * 60_000)

      const auth = yield* Auth
      const db = yield* Db
      const user = {
        id: randomUUID(),
        email: `guest-${randomBytes(8).toString("hex")}@guest.opentxt.local`,
        passwordHash: yield* auth.hashPassword(randomBytes(24).toString("hex")),
        createdAt: Date.now(),
      }
      yield* db.createUser(user)
      const token = yield* auth.signToken({ userId: user.id, email: user.email })
      return json({ token, user: { id: user.id, email: user.email } }, 201)
    }).pipe(
      Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))),
      Effect.catch((e) =>
        Effect.logError(`guest failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
