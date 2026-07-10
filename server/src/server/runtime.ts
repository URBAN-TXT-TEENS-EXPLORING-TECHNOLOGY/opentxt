import "dotenv/config"
import { Layer, ManagedRuntime } from "effect"
import { Ai } from "./ai"
import { Auth } from "./auth"
import { Db } from "./db"
import { LiveKitVoice } from "./livekit"
import { RateLimit } from "./rate-limit"
import { OpenAiRealtime } from "./realtime"

/**
 * Server-only Effect runtime. Layers build lazily; a missing env var surfaces
 * as a ConfigError when the owning service is first used, so e.g. the chat
 * API works without LiveKit credentials configured. `dotenv/config` loads
 * `.env` in dev.
 */
const AppLayer = Layer.mergeAll(
  Db.layer,
  Auth.layer,
  Ai.layer,
  LiveKitVoice.layer,
  OpenAiRealtime.layer,
  RateLimit.layer,
)

export const runtime = ManagedRuntime.make(AppLayer)

/**
 * Graceful shutdown: dispose the runtime (closes the SQLite handle, drains
 * finalizers) before the process exits. mochi/core flagged this as the
 * follow-up to do once stateful services arrive — we have one from day one.
 */
const shutdown = (signal: NodeJS.Signals) => {
  void runtime.dispose().finally(() => {
    process.kill(process.pid, signal)
  })
}
process.once("SIGTERM", shutdown)
process.once("SIGINT", shutdown)
