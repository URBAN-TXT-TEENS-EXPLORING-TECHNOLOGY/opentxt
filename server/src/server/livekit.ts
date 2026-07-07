import { Context, Data, Effect, Layer, Redacted, Schema } from "effect"
import { AccessToken } from "livekit-server-sdk"
import { randomUUID } from "node:crypto"
import { LiveKitConfig } from "./config"

export class LiveKitError extends Data.TaggedError("LiveKitError")<{
  readonly cause: unknown
}> {}

/** What the Expo client needs to join a voice room. */
export const ConnectionDetails = Schema.Struct({
  serverUrl: Schema.String,
  roomName: Schema.String,
  participantName: Schema.String,
  participantToken: Schema.String,
})
export type ConnectionDetails = typeof ConnectionDetails.Type

/**
 * LiveKit room-token minting. Each voice session gets a fresh random room and
 * a 15-minute participant token. The current text-chat history rides along in
 * the participant `attributes` (`historyMessages`) — the agent worker reads it
 * to seed the Realtime model's instructions, same context bridge the original
 * Python agent used.
 */
export class LiveKitVoice extends Context.Service<LiveKitVoice>()("opentxt/LiveKitVoice", {
  make: Effect.succeed({
    /**
     * Config is resolved PER CALL (not at layer build): the whole AppLayer is
     * materialized on the runtime's first use, so reading LIVEKIT_* here at
     * `make` time would take every route down when LiveKit isn't configured.
     * This way only /api/voice/livekit needs the credentials.
     */
    connectionDetails: (
      userId: string,
      historyMessages: string,
    ): Effect.Effect<ConnectionDetails, LiveKitError> =>
      Effect.gen(function* () {
        const cfg = yield* LiveKitConfig.pipe(
          Effect.mapError((cause) => new LiveKitError({ cause })),
        )
        return yield* Effect.tryPromise({
          try: async () => {
            const roomName = `voice_${randomUUID()}`
            const participantName = `user_${userId.slice(0, 8)}`
            const at = new AccessToken(cfg.apiKey, Redacted.value(cfg.apiSecret), {
              identity: participantName,
              ttl: "15m",
              attributes: { historyMessages },
            })
            // Narrow grant: audio-only voice flow — no data publishing.
            at.addGrant({
              room: roomName,
              roomJoin: true,
              canPublish: true,
              canSubscribe: true,
            })
            return {
              serverUrl: cfg.url,
              roomName,
              participantName,
              participantToken: await at.toJwt(), // async in v2 (jose-backed)
            }
          },
          catch: (cause) => new LiveKitError({ cause }),
        })
      }),
  } as const),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
