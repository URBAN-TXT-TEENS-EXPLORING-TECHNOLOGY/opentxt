import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { decodeBody, errorJson, json, serializeVoiceHistory, voiceInstructions } from "~/server/http"
import { OpenAiRealtime } from "~/server/realtime"
import { runtime } from "~/server/runtime"

const VoiceRequest = Schema.Struct({
  chatId: Schema.optionalKey(Schema.String),
})

/**
 * Direct OpenAI Realtime voice mode: mint a GA ephemeral client secret with
 * the session config (model, voice, instructions incl. server-serialized
 * chat history) bound server-side. The Expo app connects straight to OpenAI
 * over WebRTC with it. (Response shape of /v1/realtime/client_secrets
 * verified against the live API: flat `{value, expires_at, session}`.)
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const input = yield* decodeBody(event.request, VoiceRequest)
      const db = yield* Db

      let history = ""
      if (input.chatId !== undefined) {
        const chat = yield* db.getChat(input.chatId)
        if (chat === null || chat.userId !== user.userId) return errorJson(404, "chat not found")
        history = serializeVoiceHistory(yield* db.listMessages(chat.id))
      }

      const realtime = yield* OpenAiRealtime
      const secret = yield* realtime.mintClientSecret(voiceInstructions(history))
      return json({ clientSecret: secret.value, expiresAt: secret.expires_at ?? null })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`realtime secret failed: ${String(e)}`).pipe(
          Effect.as(errorJson(502, "could not create realtime session")),
        ),
      ),
    ),
  )
}
