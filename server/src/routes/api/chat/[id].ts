import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { Auth } from "~/server/auth"
import { Db, type ChatRow } from "~/server/db"
import { errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

/** Load a chat the caller owns, or null. */
const ownedChat = (id: string, userId: string) =>
  Effect.gen(function* () {
    const db = yield* Db
    const chat = yield* db.getChat(id)
    return chat !== null && chat.userId === userId ? chat : null
  })

/** A chat's messages, oldest first (resuming a conversation in the app). */
export async function GET(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const id = event.params.id ?? ""
      const chat: ChatRow | null = yield* ownedChat(id, user.userId)
      if (chat === null) return errorJson(404, "chat not found")
      const db = yield* Db
      const messages = yield* db.listMessages(chat.id)
      return json({
        chat: { id: chat.id, title: chat.title, createdAt: chat.createdAt },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`chat get failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}

/** Delete a chat (messages cascade). */
export async function DELETE(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const id = event.params.id ?? ""
      const chat = yield* ownedChat(id, user.userId)
      if (chat === null) return errorJson(404, "chat not found")
      const db = yield* Db
      yield* db.deleteChat(chat.id)
      return json({ deleted: chat.id })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`chat delete failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
