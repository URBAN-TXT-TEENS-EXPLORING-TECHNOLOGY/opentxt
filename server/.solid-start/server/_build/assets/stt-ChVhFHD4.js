import { Effect } from "effect";
import { r as runtime, A as Auth, a as Ai } from "./runtime-Dcl443l5.js";
import { e as errorJson, j as json } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
async function POST(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    yield* auth.requireUser(event.request);
    const form = yield* Effect.tryPromise({
      try: () => event.request.formData(),
      catch: () => null
    }).pipe(Effect.catch(() => Effect.succeed(null)));
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return errorJson(400, "expected multipart form data with a `file` field");
    }
    const ai = yield* Ai;
    const text = yield* ai.transcribe(file);
    return json({
      text
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catch((e) => Effect.logError(`stt failed: ${String(e)}`).pipe(Effect.as(errorJson(502, "transcription failed"))))));
}
export {
  POST
};
//# sourceMappingURL=stt-ChVhFHD4.js.map
