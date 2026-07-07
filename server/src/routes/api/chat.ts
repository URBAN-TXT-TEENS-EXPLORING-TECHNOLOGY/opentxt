import type { APIEvent } from "@solidjs/start/server"
import { Effect, Fiber, Schema, Stream } from "effect"
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
 *   3. persist the accumulated assistant text via a stream FINALIZER
 *      (`Stream.ensuring`), so it survives client disconnects and upstream
 *      failures alike — not just the happy path,
 *   4. for new chats, title generation runs on a DETACHED fiber
 *      (`Effect.forkDetach`): the DB write happens even if the client hangs
 *      up; the `title` frame itself is best-effort.
 *
 * Events: `{type:"chat",chatId}` first, then `delta`/`title` interleaved,
 * then `done` as the TERMINAL frame (emitted after both the reply and the
 * title branch finish — a client may close on `done`). On failure the
 * terminal frame is `{type:"error",message}` instead. The Expo client
 * consumes these with `expo/fetch` (which streams natively; no
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

      // Deltas stream to the client and accumulate for the final persist. The
      // persist is a FINALIZER on the delta stream (not a concat continuation):
      // it runs on normal completion, upstream failure, AND client disconnect,
      // so text the user already saw is never silently dropped.
      const collected: Array<string> = []
      const persistAssistant = Effect.suspend(() => {
        const content = collected.join("")
        return content.length === 0
          ? Effect.void
          : db
              .insertMessage({
                id: randomUUID(),
                chatId,
                role: "assistant",
                content,
                createdAt: Date.now(),
              })
              .pipe(
                // The user already saw this text — a failed persist must be loud.
                Effect.catch((e) =>
                  Effect.logError(`assistant persist FAILED for chat ${chatId}: ${e._tag}`),
                ),
              )
      })
      const deltas = ai.streamChat(turns).pipe(
        Stream.tap((delta) => Effect.sync(() => collected.push(delta))),
        Stream.map((delta) => sseFrame({ type: "delta", text: delta })),
        Stream.ensuring(persistAssistant),
      )

      // New-chat title: a DETACHED fiber so `setChatTitle` survives the client
      // hanging up mid-stream; failures are logged inside the fiber and yield
      // null (no title frame). The stream branch just joins the fiber.
      const titleFiber = isNewChat
        ? yield* ai.generateTitle(input.message).pipe(
            Effect.tap((t) => db.setChatTitle(chatId, t)),
            Effect.catch((e) =>
              Effect.logWarning(`title generation failed for chat ${chatId}: ${e._tag}`).pipe(
                Effect.as(null),
              ),
            ),
            Effect.forkDetach,
          )
        : null
      const title =
        titleFiber === null
          ? Stream.empty
          : Stream.fromEffect(Fiber.join(titleFiber)).pipe(
              Stream.flatMap((t) =>
                t === null ? Stream.empty : Stream.make(sseFrame({ type: "title", title: t })),
              ),
            )

      // `chat` is guaranteed first; `done` is guaranteed terminal (after BOTH
      // the reply and the title branch), so clients may close on `done`.
      const events = Stream.make(sseFrame({ type: "chat", chatId })).pipe(
        Stream.concat(Stream.merge(deltas, title)),
        Stream.concat(Stream.make(sseFrame({ type: "done" }))),
        Stream.catch((e) =>
          Stream.fromEffect(
            Effect.logError(`chat stream failed for chat ${chatId}: ${String(e)}`).pipe(
              Effect.as(sseFrame({ type: "error", message: `${e._tag}` })),
            ),
          ),
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
