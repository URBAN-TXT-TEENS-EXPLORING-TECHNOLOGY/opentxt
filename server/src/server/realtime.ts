import { Context, Data, Effect, Layer, Redacted, Schema } from "effect"
import { OpenAiConfig } from "./config"

export class RealtimeError extends Data.TaggedError("RealtimeError")<{
  readonly cause: unknown
  readonly status?: number
}> {}

/** GA `/v1/realtime/client_secrets` response slice the client needs. */
export const ClientSecret = Schema.Struct({
  value: Schema.String,
  expires_at: Schema.optionalKey(Schema.Number),
})
export type ClientSecret = typeof ClientSecret.Type

/**
 * OpenAI Realtime (GA) ephemeral-secret minting for the DIRECT voice mode:
 * the Expo app takes this `ek_...` secret straight to
 * `POST https://api.openai.com/v1/realtime/calls` over WebRTC — the real API
 * key never leaves this server. Session config (model, voice, instructions
 * with chat history) is bound server-side at mint time, so the client can't
 * override it.
 */
export class OpenAiRealtime extends Context.Service<OpenAiRealtime>()("opentxt/OpenAiRealtime", {
  make: Effect.gen(function* () {
    const cfg = yield* OpenAiConfig

    return {
      mintClientSecret: (instructions: string): Effect.Effect<ClientSecret, RealtimeError> =>
        Effect.gen(function* () {
          const res = yield* Effect.tryPromise({
            try: (signal) =>
              fetch(`${cfg.baseUrl}/realtime/client_secrets`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Redacted.value(cfg.apiKey)}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  session: {
                    type: "realtime",
                    model: cfg.realtimeModel,
                    instructions,
                    // Docs-recommended default for Realtime-2-class voice
                    // agents (verified accepted live); reasoning doesn't
                    // exist on pre-2 models, so gate on the model name.
                    ...(cfg.realtimeModel.startsWith("gpt-realtime-2")
                      ? { reasoning: { effort: "low" } }
                      : {}),
                    audio: { output: { voice: cfg.realtimeVoice } },
                  },
                }),
                signal,
              }),
            catch: (cause) => new RealtimeError({ cause }),
          })
          if (!res.ok) {
            const text = yield* Effect.tryPromise({
              try: () => res.text(),
              catch: (cause) => new RealtimeError({ cause, status: res.status }),
            })
            return yield* Effect.fail(
              new RealtimeError({ cause: text.slice(0, 500), status: res.status }),
            )
          }
          const json = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (cause) => new RealtimeError({ cause }),
          })
          return yield* Schema.decodeUnknownEffect(ClientSecret)(json).pipe(
            Effect.mapError((cause) => new RealtimeError({ cause })),
          )
        }),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
