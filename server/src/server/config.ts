import { Config, Redacted } from "effect"

/**
 * Configuration, read from the environment via Effect's default ConfigProvider.
 * Secrets are `Config.redacted` so they can't be logged by accident. Missing
 * required vars fail the owning layer with a ConfigError the first time the
 * service is used.
 */

/** Signing secret for the mobile-auth JWTs (jose HS256). REQUIRED. */
export const AuthConfig = Config.all({
  secret: Config.redacted("AUTH_SECRET"),
})

/** SQLite database file. Defaults to a repo-local path; created on first use. */
export const DatabaseConfig = Config.all({
  path: Config.string("DATABASE_PATH").pipe(Config.withDefault("./data/opentxt.db")),
})

/**
 * OpenAI config. One key powers text chat (chat completions), STT
 * (transcriptions) and Realtime voice (ephemeral client secrets + the LiveKit
 * agent's RealtimeModel).
 */
export const OpenAiConfig = Config.all({
  apiKey: Config.redacted("OPENAI_API_KEY"),
  baseUrl: Config.string("OPENAI_BASE_URL").pipe(Config.withDefault("https://api.openai.com/v1")),
  chatModel: Config.string("OPENAI_CHAT_MODEL").pipe(Config.withDefault("gpt-4.1-mini")),
  /** Comma-separated allowlist the model picker exposes; first is NOT the
   *  default — `chatModel` is. A client-requested model must be in here. */
  chatModels: Config.string("OPENAI_CHAT_MODELS").pipe(
    Config.withDefault("gpt-4.1-mini,gpt-4.1"),
  ),
  sttModel: Config.string("OPENAI_STT_MODEL").pipe(Config.withDefault("whisper-1")),
  // gpt-realtime-2.1 is OpenAI's current recommended voice-agent model
  // (GPT-5-class reasoning, 128k ctx, better interruption handling).
  realtimeModel: Config.string("OPENAI_REALTIME_MODEL").pipe(
    Config.withDefault("gpt-realtime-2.1"),
  ),
  realtimeVoice: Config.string("OPENAI_REALTIME_VOICE").pipe(Config.withDefault("marin")),
})

/**
 * LiveKit server credentials — used ONLY to mint room access tokens for the
 * Expo client. The agent worker (opentxt/agent) reads the same env names via
 * the LiveKit CLI conventions.
 */
export const LiveKitConfig = Config.all({
  url: Config.string("LIVEKIT_URL"),
  apiKey: Config.string("LIVEKIT_API_KEY"),
  apiSecret: Config.redacted("LIVEKIT_API_SECRET"),
})

export { Redacted }
