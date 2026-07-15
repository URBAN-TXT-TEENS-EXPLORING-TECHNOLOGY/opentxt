import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { decodeBody, errorJson, json, serializeVoiceHistory, tooManyRequests } from "~/server/http"
import { LiveKitVoice } from "~/server/livekit"
import { RateLimit } from "~/server/rate-limit"
import { runtime } from "~/server/runtime"

const VoiceRequest = Schema.Struct({
  /** Chat to carry into the voice session. History is serialized SERVER-side. */
  chatId: Schema.optionalKey(Schema.String),
  /** Realtime model backend for the agent; validated against the closed set. */
  provider: Schema.optionalKey(Schema.Literals(["openai", "google"])),
})

/**
 * LiveKit voice mode: mint room connection details for the Expo client. The
 * agent worker (opentxt/agent) is dispatched to the room by LiveKit and reads
 * the (server-serialized, ownership-checked) chat history from the
 * participant attributes.
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const rl = yield* RateLimit
      // Voice sessions cost real money; cap mints per user.
      yield* rl.hit(`voice:${user.userId}`, 10, 5 * 60_000)
      const input = yield* decodeBody(event.request, VoiceRequest)
      const db = yield* Db

      let history = ""
      if (input.chatId !== undefined) {
        const chat = yield* db.getChat(input.chatId)
        if (chat === null || chat.userId !== user.userId) return errorJson(404, "chat not found")
        history = serializeVoiceHistory(yield* db.listMessages(chat.id))
      }

      const lk = yield* LiveKitVoice
      const details = yield* lk.connectionDetails(user.userId, history, input.provider ?? "openai")
      return json(details)
    }).pipe(
      Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))),
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`livekit connection failed: ${String(e)}`).pipe(
          Effect.as(errorJson(502, "could not create voice session")),
        ),
      ),
    ),
  )
}
