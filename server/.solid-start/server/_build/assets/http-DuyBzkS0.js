import { Effect, Schema, Data } from "effect";
const Email = Schema.String.check(Schema.isPattern(/^[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/));
class BadRequest extends Data.TaggedError("BadRequest") {
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json"
  }
});
const errorJson = (status, message) => json({
  error: message
}, status);
const tooManyRequests = (retryAfterMs) => new Response(JSON.stringify({
  error: "too many requests"
}), {
  status: 429,
  headers: {
    "Content-Type": "application/json",
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1e3)))
  }
});
const decodeBody = (request, schema) => Effect.tryPromise({
  try: () => request.json(),
  catch: () => new BadRequest({
    reason: "expected a JSON body"
  })
}).pipe(Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body).pipe(Effect.mapError((e) => new BadRequest({
  reason: String(e)
})))));
const sseFrame = (data) => `data: ${JSON.stringify(data)}

`;
const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive"
};
const voiceInstructions = (history) => "You are opentxt's voice assistant. Your interface with the user is voice: keep responses short and conversational, and avoid unpronounceable punctuation." + (history.length > 0 ? ` Previous chat history with this user: ${history}` : "");
const VOICE_HISTORY_MAX_CHARS = 2400;
const serializeVoiceHistory = (messages) => {
  const compact = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  return compact.length > VOICE_HISTORY_MAX_CHARS ? compact.slice(-VOICE_HISTORY_MAX_CHARS) : compact;
};
export {
  BadRequest as B,
  Email as E,
  SSE_HEADERS as S,
  serializeVoiceHistory as a,
  decodeBody as d,
  errorJson as e,
  json as j,
  sseFrame as s,
  tooManyRequests as t,
  voiceInstructions as v
};
//# sourceMappingURL=http-DuyBzkS0.js.map
