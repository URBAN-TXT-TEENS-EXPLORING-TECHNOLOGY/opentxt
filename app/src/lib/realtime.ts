import { mediaDevices, RTCPeerConnection, type MediaStream } from "@livekit/react-native-webrtc"
import { Option, Schema } from "effect"

/**
 * Direct OpenAI Realtime (GA) voice session over WebRTC. The server mints an
 * ephemeral client secret (`/api/voice/realtime`) with the session config —
 * model, voice, instructions + chat history — bound server-side; this class
 * only does the SDP exchange with `POST /v1/realtime/calls` and listens on
 * the `oai-events` data channel. Session events use the GA names
 * (`response.output_audio_transcript.delta` etc — the Beta API is dead).
 *
 * Remote audio needs no handling: react-native-webrtc plays incoming audio
 * tracks automatically.
 */

const OPENAI_CALLS_URL = "https://api.openai.com/v1/realtime/calls"

export type RealtimeStatus = "connecting" | "live" | "ended" | "error"

/** The GA server events we surface to the UI (everything else is ignored). */
const RealtimeEvent = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("response.output_audio_transcript.delta"),
    delta: Schema.String,
  }),
  Schema.Struct({ type: Schema.Literal("response.output_audio_transcript.done") }),
  Schema.Struct({ type: Schema.Literal("input_audio_buffer.speech_started") }),
  Schema.Struct({ type: Schema.Literal("error") }),
])
const decodeRealtimeEvent = Schema.decodeUnknownOption(RealtimeEvent)

export type RealtimeCallbacks = {
  onStatus: (status: RealtimeStatus) => void
  /** Streaming assistant transcript: delta text + whether the utterance ended. */
  onTranscript: (delta: string, done: boolean) => void
}

export class RealtimeVoiceSession {
  private pc: RTCPeerConnection | null = null
  private mic: MediaStream | null = null

  constructor(private readonly callbacks: RealtimeCallbacks) {}

  async start(clientSecret: string): Promise<void> {
    this.callbacks.onStatus("connecting")
    try {
      const mic = await mediaDevices.getUserMedia({ audio: true })
      this.mic = mic
      const pc = new RTCPeerConnection()
      this.pc = pc
      for (const track of mic.getAudioTracks()) {
        pc.addTrack(track, mic)
      }

      const channel = pc.createDataChannel("oai-events")
      channel.addEventListener("message", (event) => {
        this.handleEvent(typeof event.data === "string" ? event.data : "")
      })
      channel.addEventListener("open", () => {
        this.callbacks.onStatus("live")
      })

      const offer = await pc.createOffer({})
      await pc.setLocalDescription(offer)
      const res = await fetch(OPENAI_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      })
      if (!res.ok) {
        throw new Error(`realtime SDP exchange failed (${res.status})`)
      }
      const answer = await res.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answer })
    } catch (e) {
      this.callbacks.onStatus("error")
      this.end()
      throw e
    }
  }

  private handleEvent(raw: string): void {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return
    }
    const event = decodeRealtimeEvent(json)
    if (Option.isNone(event)) return
    switch (event.value.type) {
      case "response.output_audio_transcript.delta":
        this.callbacks.onTranscript(event.value.delta, false)
        break
      case "response.output_audio_transcript.done":
        this.callbacks.onTranscript("", true)
        break
      case "input_audio_buffer.speech_started":
        break
      case "error":
        this.callbacks.onStatus("error")
        break
    }
  }

  end(): void {
    if (this.mic !== null) {
      for (const track of this.mic.getTracks()) track.stop()
      this.mic = null
    }
    if (this.pc !== null) {
      this.pc.close()
      this.pc = null
    }
    this.callbacks.onStatus("ended")
  }
}
