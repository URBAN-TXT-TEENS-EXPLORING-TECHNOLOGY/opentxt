import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

/** The user's chats, newest first (the history drawer). */
export async function GET(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const db = yield* Db
      const chats = yield* db.listChats(user.userId)
      return json({
        chats: chats.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt })),
      })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`history failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
