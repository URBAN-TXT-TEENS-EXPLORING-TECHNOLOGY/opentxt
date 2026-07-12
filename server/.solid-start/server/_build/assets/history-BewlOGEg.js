import { Effect } from "effect";
import { r as runtime, A as Auth, D as Db } from "./runtime-Dcl443l5.js";
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
    const user = yield* auth.requireUser(event.request);
    const db = yield* Db;
    const chats = yield* db.listChats(user.userId);
    return json({
      chats: chats.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt
      }))
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catch((e) => Effect.logError(`history failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  GET
};
//# sourceMappingURL=history-BewlOGEg.js.map
