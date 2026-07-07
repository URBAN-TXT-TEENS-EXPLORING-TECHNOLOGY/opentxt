import { Context, Data, Effect, Layer, Option, Redacted, Schema, Stream } from "effect"
import { OpenAiConfig } from "./config"

export class AiError extends Data.TaggedError("AiError")<{
  readonly cause: unknown
  readonly status?: number
}> {}

/** One turn of model input. The system prompt is composed by callers. */
export const ChatTurn = Schema.Struct({
  role: Schema.Literals(["system", "user", "assistant"]),
  content: Schema.String,
})
export type ChatTurn = typeof ChatTurn.Type

/** The slice of an OpenAI streaming chunk we consume (parse, don't trust). */
const ChatChunk = Schema.Struct({
  choices: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        delta: Schema.optionalKey(
          Schema.Struct({ content: Schema.optionalKey(Schema.NullOr(Schema.String)) }),
        ),
      }),
    ),
  ),
})
const decodeChunk = Schema.decodeUnknownOption(ChatChunk)

/** The slice of a non-streaming completion we consume. */
const ChatCompletion = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      message: Schema.Struct({ content: Schema.NullOr(Schema.String) }),
    }),
  ),
})

/** Whisper transcription response. */
const Transcription = Schema.Struct({ text: Schema.String })

/** One `data: {...}` SSE line -> the text delta it carries, or null.
 *  Exported for tests. */
export const parseDeltaLine = (line: string): string | null => {
  if (!line.startsWith("data:")) return null
  const data = line.slice("data:".length).trim()
  if (data.length === 0 || data === "[DONE]") return null
  let json: unknown
  try {
    json = JSON.parse(data)
  } catch {
    return null
  }
  const chunk = decodeChunk(json)
  if (Option.isNone(chunk)) return null
  const content = chunk.value.choices?.[0]?.delta?.content
  return typeof content === "string" && content.length > 0 ? content : null
}

/**
 * OpenAI service — raw `fetch` against the REST API wrapped in Effect (no SDK:
 * the three calls we need are small, and this keeps streaming fully inside
 * Effect's Stream). Covers text chat (streaming + one-shot title) and STT.
 * Realtime voice lives in `realtime.ts` (ephemeral secrets) and the LiveKit
 * agent worker.
 */
export class Ai extends Context.Service<Ai>()("opentxt/Ai", {
  make: Effect.gen(function* () {
    const cfg = yield* OpenAiConfig
    const authHeader = { Authorization: `Bearer ${Redacted.value(cfg.apiKey)}` }

    const post = (path: string, body: BodyInit, headers: Record<string, string>) =>
      Effect.tryPromise({
        try: (signal) =>
          fetch(`${cfg.baseUrl}${path}`, { method: "POST", headers, body, signal }),
        catch: (cause) => new AiError({ cause }),
      }).pipe(
        Effect.flatMap((res) =>
          res.ok
            ? Effect.succeed(res)
            : Effect.tryPromise({
                try: () => res.text(),
                catch: (cause) => new AiError({ cause, status: res.status }),
              }).pipe(
                Effect.flatMap((text) =>
                  Effect.fail(new AiError({ cause: text.slice(0, 500), status: res.status })),
                ),
              ),
        ),
      )

    const postJson = (path: string, body: unknown) =>
      post(path, JSON.stringify(body), { ...authHeader, "Content-Type": "application/json" })

    return {
      /**
       * Streaming chat completion as a Stream of text deltas. The upstream SSE
       * body is decoded, split into lines, and parsed through `ChatChunk` —
       * malformed chunks are dropped at the boundary, never propagated.
       */
      streamChat: (turns: ReadonlyArray<ChatTurn>): Stream.Stream<string, AiError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const res = yield* postJson("/chat/completions", {
              model: cfg.chatModel,
              stream: true,
              messages: turns,
            })
            if (res.body === null) {
              return yield* Effect.fail(new AiError({ cause: "response had no body" }))
            }
            const body = res.body
            return Stream.fromReadableStream({
              evaluate: () => body,
              onError: (cause) => new AiError({ cause }),
            }).pipe(
              Stream.decodeText(),
              Stream.splitLines,
              Stream.flatMap((line) => {
                const delta = parseDeltaLine(line)
                return delta === null ? Stream.empty : Stream.make(delta)
              }),
            )
          }),
        ),

      /** One-shot short title for a new chat, from the first user message. */
      generateTitle: (firstMessage: string): Effect.Effect<string, AiError> =>
        Effect.gen(function* () {
          const res = yield* postJson("/chat/completions", {
            model: cfg.chatModel,
            messages: [
              {
                role: "system",
                content:
                  "Generate a short title (max 5 words, no quotes, no punctuation at the end) summarizing the user's message.",
              },
              { role: "user", content: firstMessage.slice(0, 2000) },
            ],
          })
          const json = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (cause) => new AiError({ cause }),
          })
          const completion = yield* Schema.decodeUnknownEffect(ChatCompletion)(json).pipe(
            Effect.mapError((cause) => new AiError({ cause })),
          )
          const title = completion.choices[0]?.message.content
          // Collapse whitespace: a model that ignores the prompt and emits
          // newlines must not produce a multi-line title.
          const clean = (title ?? "").replace(/\s+/g, " ").trim().slice(0, 80)
          return clean.length === 0 ? "New chat" : clean
        }),

      /** Transcribe an uploaded audio file (the in-chat mic button). */
      transcribe: (file: File): Effect.Effect<string, AiError> =>
        Effect.gen(function* () {
          const form = new FormData()
          form.append("file", file)
          form.append("model", cfg.sttModel)
          const res = yield* post("/audio/transcriptions", form, authHeader)
          const json = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (cause) => new AiError({ cause }),
          })
          const parsed = yield* Schema.decodeUnknownEffect(Transcription)(json).pipe(
            Effect.mapError((cause) => new AiError({ cause })),
          )
          return parsed.text
        }),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
