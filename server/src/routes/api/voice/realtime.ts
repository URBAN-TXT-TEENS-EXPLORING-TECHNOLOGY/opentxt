import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { Auth } from "~/server/auth"
import { decodeBody, errorJson, json, voiceInstructions } from "~/server/http"
import { OpenAiRealtime } from "~/server/realtime"
import { runtime } from "~/server/runtime"

const VoiceRequest = Schema.Struct({
  historyMessages: Schema.optionalKey(Schema.String),
})

/**
 * Direct OpenAI Realtime voice mode: mint a GA ephemeral client secret with
 * the session config (model, voice, instructions incl. chat history) bound
 * server-side. The Expo app connects straight to OpenAI over WebRTC with it.
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      yield* auth.requireUser(event.request)
      const input = yield* decodeBody(event.request, VoiceRequest)
      const realtime = yield* OpenAiRealtime
      const secret = yield* realtime.mintClientSecret(
        voiceInstructions(input.historyMessages ?? ""),
      )
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
