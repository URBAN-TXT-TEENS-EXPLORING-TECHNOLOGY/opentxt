import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { randomUUID } from "node:crypto"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { decodeBody, Email, errorJson, json, tooManyRequests } from "~/server/http"
import { clientAddress, RateLimit } from "~/server/rate-limit"
import { runtime } from "~/server/runtime"

const RegisterRequest = Schema.Struct({
  email: Email,
  password: Schema.String.check(Schema.isMinLength(8)),
})

/** Create an account and return a Bearer token (the app signs in immediately). */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const rl = yield* RateLimit
      yield* rl.hit(`register:${clientAddress(event.request)}`, 5, 15 * 60_000)
      const input = yield* decodeBody(event.request, RegisterRequest)
      const auth = yield* Auth
      const db = yield* Db

      const existing = yield* db.getUserByEmail(input.email)
      if (existing !== null) return errorJson(409, "email already registered")

      const user = {
        id: randomUUID(),
        email: input.email,
        passwordHash: yield* auth.hashPassword(input.password),
        createdAt: Date.now(),
      }
      yield* db.createUser(user)
      const token = yield* auth.signToken({ userId: user.id, email: user.email })
      return json({ token, user: { id: user.id, email: user.email } }, 201)
    }).pipe(
      Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))),
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`register failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
