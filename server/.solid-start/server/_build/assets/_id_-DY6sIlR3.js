import { Effect } from "effect";
import { r as runtime, A as Auth, D as Db } from "./runtime-Dcl443l5.js";
import { e as errorJson, j as json } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const ownedChat = (id, userId) => Effect.gen(function* () {
  const db = yield* Db;
  const chat = yield* db.getChat(id);
  return chat !== null && chat.userId === userId ? chat : null;
});
async function DELETE(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    const user = yield* auth.requireUser(event.request);
    const id = event.params.id ?? "";
    const chat = yield* ownedChat(id, user.userId);
    if (chat === null) return errorJson(404, "chat not found");
    const db = yield* Db;
    yield* db.deleteChat(chat.id);
    return json({
      deleted: chat.id
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catch((e) => Effect.logError(`chat delete failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  DELETE
};
//# sourceMappingURL=_id_-DY6sIlR3.js.map
