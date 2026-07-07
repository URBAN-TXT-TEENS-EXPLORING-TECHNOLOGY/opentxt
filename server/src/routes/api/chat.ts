import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema, Stream } from "effect"
import { randomUUID } from "node:crypto"
import { Ai, type ChatTurn } from "~/server/ai"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { decodeBody, errorJson, SSE_HEADERS, sseFrame } from "~/server/http"
import { runtime } from "~/server/runtime"

const ChatRequest = Schema.Struct({
  chatId: Schema.optionalKey(Schema.String),
  message: Schema.String.check(Schema.isMinLength(1)),
})

const SYSTEM_PROMPT =
  "You are opentxt, a friendly and concise assistant. Format answers in Markdown when it helps."

/**
 * The streaming chat endpoint. One POST = one user turn:
 *
 *   1. persist the user message (creating the chat on first turn),
 *   2. stream the assistant reply as SSE `delta` events,
 *   3. persist the full assistant reply when the stream completes,
 *   4. for new chats, a model-generated `title` event is merged in
 *      concurrently (the original repo's parallel-title pattern).
 *
 * Events: `{type:"chat",chatId}` `{type:"delta",text}` `{type:"title",title}`
 * `{type:"done"}` `{type:"error",message}` — the Expo client consumes these
 * with `expo/fetch` (which supports response streaming; no
 * application/octet-stream workaround needed anymore).
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const input = yield* decodeBody(event.request, ChatRequest)
      const db = yield* Db
      const ai = yield* Ai

      // Resolve the chat: verify ownership of an existing one, or create.
      let chatId: string
      let isNewChat: boolean
      if (input.chatId !== undefined) {
        const chat = yield* db.getChat(input.chatId)
        if (chat === null || chat.userId !== user.userId) {
          return errorJson(404, "chat not found")
        }
        chatId = chat.id
        isNewChat = false
      } else {
        chatId = randomUUID()
        isNewChat = true
        yield* db.createChat({
          id: chatId,
          userId: user.userId,
          title: "New chat",
          createdAt: Date.now(),
        })
      }

      yield* db.insertMessage({
        id: randomUUID(),
        chatId,
        role: "user",
        content: input.message,
        createdAt: Date.now(),
      })

      const history = yield* db.listMessages(chatId)
      const turns: ReadonlyArray<ChatTurn> = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m): ChatTurn => ({ role: m.role, content: m.content })),
      ]

      // Deltas stream to the client and accumulate for the final persist.
      const collected: Array<string> = []
      const deltas = ai.streamChat(turns).pipe(
        Stream.tap((delta) => Effect.sync(() => collected.push(delta))),
        Stream.map((delta) => sseFrame({ type: "delta", text: delta })),
      )

      const persistAndFinish = Stream.fromEffect(
        Effect.gen(function* () {
          const content = collected.join("")
          if (content.length > 0) {
            yield* db.insertMessage({
              id: randomUUID(),
              chatId,
              role: "assistant",
              content,
              createdAt: Date.now(),
            })
          }
          return sseFrame({ type: "done" })
        }),
      )

      const main = Stream.make(sseFrame({ type: "chat", chatId })).pipe(
        Stream.concat(deltas),
        Stream.concat(persistAndFinish),
      )

      // New chats get a concurrent title generation; failure just drops the event.
      const title = isNewChat
        ? Stream.fromEffect(
            ai.generateTitle(input.message).pipe(
              Effect.tap((t) => db.setChatTitle(chatId, t)),
              Effect.map((t) => sseFrame({ type: "title", title: t })),
            ),
          ).pipe(Stream.catch(() => Stream.empty))
        : Stream.empty

      const events = Stream.merge(main, title).pipe(
        Stream.catch((e) =>
          Stream.make(sseFrame({ type: "error", message: `${e._tag}` })),
        ),
        Stream.encodeText,
      )

      const body = yield* Stream.toReadableStreamEffect(events)
      return new Response(body, { headers: SSE_HEADERS })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`chat failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
