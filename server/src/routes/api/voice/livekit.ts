import type { APIEvent } from "@solidjs/start/server"
import { Effect, Schema } from "effect"
import { Auth } from "~/server/auth"
import { decodeBody, errorJson, json } from "~/server/http"
import { LiveKitVoice } from "~/server/livekit"
import { runtime } from "~/server/runtime"

const VoiceRequest = Schema.Struct({
  /** Serialized current text-chat history — the voice agent's context bridge. */
  historyMessages: Schema.optionalKey(Schema.String),
})

/**
 * LiveKit voice mode: mint room connection details for the Expo client. The
 * agent worker (opentxt/agent) is dispatched to the room by LiveKit and reads
 * `historyMessages` from the participant attributes.
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)
      const input = yield* decodeBody(event.request, VoiceRequest)
      const lk = yield* LiveKitVoice
      const details = yield* lk.connectionDetails(user.userId, input.historyMessages ?? "")
      return json(details)
    }).pipe(
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
