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
async function GET(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    const user = yield* auth.requireUser(event.request);
    const id = event.params.id ?? "";
    const chat = yield* ownedChat(id, user.userId);
    if (chat === null) return errorJson(404, "chat not found");
    const db = yield* Db;
    const messages = yield* db.listMessages(chat.id);
    return json({
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        attachments: m.attachments,
        createdAt: m.createdAt
      }))
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catch((e) => Effect.logError(`chat get failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  GET
};
//# sourceMappingURL=_id_-B9nP8DDN.js.map
