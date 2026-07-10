import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { Ai } from "~/server/ai"
import { Auth } from "~/server/auth"
import { errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

/** The model picker's allowlist + default. */
export async function GET(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      yield* auth.requireUser(event.request)
      const ai = yield* Ai
      return json({ default: ai.models.default, models: ai.models.allowed })
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`models failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "internal error")),
        ),
      ),
    ),
  )
}
