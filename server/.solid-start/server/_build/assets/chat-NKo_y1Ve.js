import { Effect, Stream, Fiber, Schema } from "effect";
import { randomUUID } from "node:crypto";
import { r as runtime, A as Auth, D as Db, a as Ai } from "./runtime-Dcl443l5.js";
import { d as decodeBody, e as errorJson, s as sseFrame, S as SSE_HEADERS } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const ChatRequest = Schema.Struct({
  chatId: Schema.optionalKey(Schema.String),
  message: Schema.String.check(Schema.isMinLength(1)),
  /** ids from POST /api/files/upload — ownership is re-checked here. */
  attachments: Schema.optionalKey(Schema.Array(Schema.String)),
  /** Must be in the server's allowlist (GET /api/models). */
  model: Schema.optionalKey(Schema.String)
});
const MAX_ATTACHMENTS = 4;
const SYSTEM_PROMPT = "You are opentxt, a friendly and concise assistant. Format answers in Markdown when it helps.";
async function POST(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const auth = yield* Auth;
    const user = yield* auth.requireUser(event.request);
    const input = yield* decodeBody(event.request, ChatRequest);
    const db = yield* Db;
    const ai = yield* Ai;
    if (input.model !== void 0 && !ai.isAllowedModel(input.model)) {
      return errorJson(400, `model not allowed: ${input.model}`);
    }
    if ((input.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
      return errorJson(400, `too many attachments (max ${MAX_ATTACHMENTS})`);
    }
    const attachmentRefs = [];
    for (const id of input.attachments ?? []) {
      const media = yield* db.getMediaOwned(id, user.userId);
      if (media === null) return errorJson(400, `unknown attachment: ${id}`);
      attachmentRefs.push({
        id: media.id,
        mime: media.mime
      });
    }
    let chatId;
    let isNewChat;
    if (input.chatId !== void 0) {
      const chat = yield* db.getChat(input.chatId);
      if (chat === null || chat.userId !== user.userId) {
        return errorJson(404, "chat not found");
      }
      chatId = chat.id;
      isNewChat = false;
    } else {
      chatId = randomUUID();
      isNewChat = true;
      yield* db.createChat({
        id: chatId,
        userId: user.userId,
        title: "New chat",
        createdAt: Date.now()
      });
    }
    yield* db.insertMessage({
      id: randomUUID(),
      chatId,
      role: "user",
      content: input.message,
      attachments: attachmentRefs.length > 0 ? attachmentRefs : null,
      createdAt: Date.now()
    });
    const history = yield* db.listMessages(chatId);
    const toTurn = (m) => Effect.gen(function* () {
      if (m.attachments === null || m.attachments.length === 0) {
        return {
          role: m.role,
          content: m.content
        };
      }
      const parts = [{
        type: "text",
        text: m.content
      }];
      for (const ref of m.attachments) {
        const media = yield* db.getMediaOwned(ref.id, user.userId);
        if (media === null) continue;
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${media.mime};base64,${Buffer.from(media.data).toString("base64")}`
          }
        });
      }
      return {
        role: m.role,
        content: parts
      };
    });
    const turns = [{
      role: "system",
      content: SYSTEM_PROMPT
    }];
    for (const m of history) {
      turns.push(yield* toTurn(m));
    }
    const collected = [];
    const persistAssistant = Effect.suspend(() => {
      const content = collected.join("");
      return content.length === 0 ? Effect.void : db.insertMessage({
        id: randomUUID(),
        chatId,
        role: "assistant",
        content,
        attachments: null,
        createdAt: Date.now()
      }).pipe(
        // The user already saw this text — a failed persist must be loud.
        Effect.catch((e) => Effect.logError(`assistant persist FAILED for chat ${chatId}: ${e._tag}`))
      );
    });
    const deltas = ai.streamChat(turns, input.model).pipe(Stream.tap((delta) => Effect.sync(() => collected.push(delta))), Stream.map((delta) => sseFrame({
      type: "delta",
      text: delta
    })), Stream.ensuring(persistAssistant));
    const titleFiber = isNewChat ? yield* ai.generateTitle(input.message).pipe(Effect.tap((t) => db.setChatTitle(chatId, t)), Effect.catch((e) => Effect.logWarning(`title generation failed for chat ${chatId}: ${e._tag}`).pipe(Effect.as(null))), Effect.forkDetach) : null;
    const title = titleFiber === null ? Stream.empty : Stream.fromEffect(Fiber.join(titleFiber)).pipe(Stream.flatMap((t) => t === null ? Stream.empty : Stream.make(sseFrame({
      type: "title",
      title: t
    }))));
    const events = Stream.make(sseFrame({
      type: "chat",
      chatId
    })).pipe(Stream.concat(Stream.merge(deltas, title)), Stream.concat(Stream.make(sseFrame({
      type: "done"
    }))), Stream.catch((e) => Stream.fromEffect(Effect.logError(`chat stream failed for chat ${chatId}: ${String(e)}`).pipe(Effect.as(sseFrame({
      type: "error",
      message: `${e._tag}`
    }))))), Stream.encodeText);
    const body = yield* Stream.toReadableStreamEffect(events);
    return new Response(body, {
      headers: SSE_HEADERS
    });
  }).pipe(Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))), Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))), Effect.catch((e) => Effect.logError(`chat failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  POST
};
//# sourceMappingURL=chat-NKo_y1Ve.js.map
