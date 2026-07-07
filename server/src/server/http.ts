import { Data, Effect, Schema } from "effect"

/** A request body that failed to parse or decode. Routes map this to a 400. */
export class BadRequest extends Data.TaggedError("BadRequest")<{
  readonly reason: string
}> {}

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })

export const errorJson = (status: number, message: string): Response =>
  json({ error: message }, status)

/** Read + decode a JSON request body through a Schema (parse, don't validate). */
export const decodeBody = <S extends Schema.Top>(
  request: Request,
  schema: S,
): Effect.Effect<S["Type"], BadRequest, S["DecodingServices"]> =>
  Effect.tryPromise({
    try: () => request.json(),
    catch: () => new BadRequest({ reason: "expected a JSON body" }),
  }).pipe(
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(schema)(body).pipe(
        Effect.mapError((e) => new BadRequest({ reason: String(e) })),
      ),
    ),
  )

/** One SSE frame carrying a JSON payload. */
export const sseFrame = (data: unknown): string => `data: ${JSON.stringify(data)}\n\n`

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const

/**
 * Shared voice-assistant instructions. Used by BOTH voice modes so LiveKit
 * agent sessions and direct OpenAI Realtime sessions behave identically.
 * `history` is the serialized text-chat context the client hands over when
 * opening a voice session.
 */
export const voiceInstructions = (history: string): string =>
  "You are opentxt's voice assistant. Your interface with the user is voice: " +
  "keep responses short and conversational, and avoid unpronounceable punctuation." +
  (history.length > 0 ? ` Previous chat history with this user: ${history}` : "")
