import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { Ai } from "~/server/ai"
import { Auth } from "~/server/auth"
import { errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

/** Transcribe a recorded audio clip (the in-chat mic button). Multipart `file`. */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      yield* auth.requireUser(event.request)

      const form = yield* Effect.tryPromise({
        try: () => event.request.formData(),
        catch: () => null,
      }).pipe(Effect.catch(() => Effect.succeed(null)))
      const file = form?.get("file")
      if (!(file instanceof File)) {
        return errorJson(400, "expected multipart form data with a `file` field")
      }

      const ai = yield* Ai
      const text = yield* ai.transcribe(file)
      return json({ text })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`stt failed: ${String(e)}`).pipe(
          Effect.as(errorJson(502, "transcription failed")),
        ),
      ),
    ),
  )
}
