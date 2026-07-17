import { type JobContext, ServerOptions, cli, defineAgent, voice } from "@livekit/agents"
import * as google from "@livekit/agents-plugin-google"
import * as openai from "@livekit/agents-plugin-openai"
import { fileURLToPath } from "node:url"

/**
 * The LiveKit voice agent — the TypeScript replacement for the original
 * Python `livekit-voice-agent` (Deepgram STT -> gpt-4o-mini -> Cartesia TTS
 * -> Silero VAD -> turn detector). The OpenAI Realtime model (GA
 * `gpt-realtime`) collapses that whole pipeline into one speech-to-speech
 * session: no separate STT/TTS vendors, built-in turn detection.
 *
 * Context bridge: the server (`/api/voice/livekit`) bakes the user's current
 * text-chat history into the participant token's `attributes.historyMessages`;
 * we read it off the first participant and seed the session instructions —
 * the same mechanism the Python agent used.
 *
 * NOTE: this worker is deliberately NOT wrapped in Effect — `cli.runApp`
 * owns the process lifecycle (worker pool, job dispatch, signals), so an
 * Effect runtime here would just fight it. Effect lives on the server.
 */

/** Keep in sync with `voiceInstructions` in opentxt/server/src/server/http.ts. */
const instructions = (history: string): string =>
  "You are opentxt's voice assistant. Your interface with the user is voice: " +
  "keep responses short and conversational, and avoid unpronounceable punctuation." +
  (history.length > 0 ? ` Previous chat history with this user: ${history}` : "")

/**
 * Realtime model per provider. The server's /api/voice/livekit route bakes a
 * validated `voiceProvider` into the participant token attributes; unknown or
 * absent values fall back to OpenAI.
 *
 * Gemini: pinned to gemini-2.5-flash-native-audio (NOT 3.1-flash-live) until
 * livekit/agents-js#1197 lands — generateReply()/say() break on 3.1's
 * continuation semantics. See opentxt/docs/VOICE.md. Requires GOOGLE_API_KEY.
 */
const realtimeModel = (provider: string) => {
  if (provider === "google") {
    // The plugin's default env var is GOOGLE_API_KEY; we also accept
    // GEMINI_API_KEY (the name Google AI Studio hands out).
    const apiKey = process.env["GOOGLE_API_KEY"] ?? process.env["GEMINI_API_KEY"]
    return new google.realtime.RealtimeModel({
      model:
        process.env["GOOGLE_REALTIME_MODEL"] ?? "gemini-2.5-flash-native-audio-preview-12-2025",
      ...(apiKey !== undefined ? { apiKey } : {}),
    })
  }
  // Model + voice pinned EXPLICITLY to the same defaults as the server's
  // direct-Realtime mode, so both voice paths behave identically and a
  // plugin default bump can't silently diverge them.
  return new openai.realtime.RealtimeModel({
    model: process.env["OPENAI_REALTIME_MODEL"] ?? "gpt-realtime-2.1",
    voice: process.env["OPENAI_REALTIME_VOICE"] ?? "marin",
  })
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect()
    const participant = await ctx.waitForParticipant()
    const history = participant.attributes["historyMessages"] ?? ""
    const provider = participant.attributes["voiceProvider"] ?? "openai"

    const agent = new voice.Agent({ instructions: instructions(history) })
    const session = new voice.AgentSession({ llm: realtimeModel(provider) })

    await session.start({ agent, room: ctx.room })
    if (provider === "google") {
      // Gemini Live has no TTS side-channel, so a text `say()` throws
      // ("trying to generate speech from text without a TTS model" —
      // observed live). Generate the greeting through the model instead.
      session.generateReply({ instructions: "Greet the user briefly and ask how you can help." })
    } else {
      session.say("Hey! How can I help?")
    }
  },
})

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }))
