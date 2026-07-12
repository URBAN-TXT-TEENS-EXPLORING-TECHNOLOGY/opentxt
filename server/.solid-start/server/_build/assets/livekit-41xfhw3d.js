import { Effect, Schema } from "effect";
import { r as runtime, A as Auth, R as RateLimit, D as Db, L as LiveKitVoice } from "./runtime-Dcl443l5.js";
import { d as decodeBody, e as errorJson, a as serializeVoiceHistory, j as json, t as tooManyRequests } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const VoiceRequest = Schema.Struct({
  /** Chat to carry into the voice session. History is serialized SERVER-side. */
  chatId: Schema.optionalKey(Schema.String)
});
async function POST(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    const user = yield* auth.requireUser(event.request);
    const rl = yield* RateLimit;
    yield* rl.hit(`voice:${user.userId}`, 10, 5 * 6e4);
    const input = yield* decodeBody(event.request, VoiceRequest);
    const db = yield* Db;
    let history = "";
    if (input.chatId !== void 0) {
      const chat = yield* db.getChat(input.chatId);
      if (chat === null || chat.userId !== user.userId) return errorJson(404, "chat not found");
      history = serializeVoiceHistory(yield* db.listMessages(chat.id));
    }
    const lk = yield* LiveKitVoice;
    const details = yield* lk.connectionDetails(user.userId, history);
    return json(details);
  }).pipe(Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))), Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))), Effect.catch((e) => Effect.logError(`livekit connection failed: ${String(e)}`).pipe(Effect.as(errorJson(502, "could not create voice session"))))));
}
export {
  POST
};
//# sourceMappingURL=livekit-41xfhw3d.js.map
