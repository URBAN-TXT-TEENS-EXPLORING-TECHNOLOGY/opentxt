import { Effect } from "effect";
import { r as runtime, A as Auth, a as Ai } from "./runtime-Dcl443l5.js";
import { j as json, e as errorJson } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
async function GET(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    yield* auth.requireUser(event.request);
    const ai = yield* Ai;
    return json({
      default: ai.models.default,
      models: ai.models.allowed
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catch((e) => Effect.logError(`models failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  GET
};
//# sourceMappingURL=models-Bq2ZPceR.js.map
