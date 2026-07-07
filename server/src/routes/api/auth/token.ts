import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { decodeBody, errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

const TokenRequest = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
})

/** Email + password -> Bearer token (7d). The app's sign-in endpoint. */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const input = yield* decodeBody(event.request, TokenRequest)
      const auth = yield* Auth
      const db = yield* Db

      const user = yield* db.getUserByEmail(input.email)
      if (user === null) return errorJson(401, "invalid credentials")
      const ok = yield* auth.verifyPassword(input.password, user.passwordHash)
      if (!ok) return errorJson(401, "invalid credentials")

      const token = yield* auth.signToken({ userId: user.id, email: user.email })
      return json({ token, user: { id: user.id, email: user.email } })
    }).pipe(
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`token failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
