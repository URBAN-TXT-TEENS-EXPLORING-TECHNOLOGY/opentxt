import { AudioSession } from "@livekit/react-native"
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
 * react-native-webrtc plays incoming audio tracks automatically; we still
 * hold a reference to the remote stream (dropping it can let the track be
 * GC'd/stopped on some platforms) and run the platform audio session so the
 * route (speaker/earpiece) is configured like the LiveKit path.
 */

const OPENAI_CALLS_URL = "https://api.openai.com/v1/realtime/calls"

/** Give ICE gathering a moment so the offer carries host candidates. */
const ICE_GATHER_MAX_MS = 1000

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

const waitForIceGathering = (pc: RTCPeerConnection): Promise<void> =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve()
      return
    }
    const timer = setTimeout(finish, ICE_GATHER_MAX_MS)
    function finish() {
      clearTimeout(timer)
      pc.removeEventListener("icegatheringstatechange", onChange)
      resolve()
    }
    function onChange() {
      if (pc.iceGatheringState === "complete") finish()
    }
    pc.addEventListener("icegatheringstatechange", onChange)
  })

export class RealtimeVoiceSession {
  private pc: RTCPeerConnection | null = null
  private mic: MediaStream | null = null
  /** Held so the remote audio track stays referenced while the call is live. */
  remoteStream: MediaStream | null = null
  private finished = false

  constructor(private readonly callbacks: RealtimeCallbacks) {}

  async start(clientSecret: string): Promise<void> {
    this.callbacks.onStatus("connecting")
    try {
      await AudioSession.startAudioSession()
      const mic = await mediaDevices.getUserMedia({ audio: true })
      this.mic = mic
      const pc = new RTCPeerConnection()
      this.pc = pc
      for (const track of mic.getAudioTracks()) {
        pc.addTrack(track, mic)
      }

      // Hold the remote stream; playback itself is automatic in RN WebRTC.
      pc.addEventListener("track", (event) => {
        this.remoteStream = event.streams[0] ?? null
      })

      // A dead transport must not leave the UI stuck on "live".
      pc.addEventListener("connectionstatechange", () => {
        if (pc.connectionState === "failed") this.fail()
        if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          this.end()
        }
      })

      const channel = pc.createDataChannel("oai-events")
      channel.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return
        this.handleEvent(event.data)
      })
      channel.addEventListener("open", () => {
        if (!this.finished) this.callbacks.onStatus("live")
      })
      channel.addEventListener("close", () => this.end())
      channel.addEventListener("error", () => this.fail())

      const offer = await pc.createOffer({})
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)
      const sdp = pc.localDescription?.sdp ?? offer.sdp
      const res = await fetch(OPENAI_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: sdp,
      })
      if (!res.ok) {
        throw new Error(`realtime SDP exchange failed (${res.status})`)
      }
      const answer = await res.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answer })
    } catch (e) {
      this.fail()
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
        this.fail()
        break
    }
  }

  /** Terminal error: tear down without letting `end` overwrite the status. */
  private fail(): void {
    if (this.finished) return
    this.finished = true
    this.teardown()
    this.callbacks.onStatus("error")
  }

  end(): void {
    if (this.finished) return
    this.finished = true
    this.teardown()
    this.callbacks.onStatus("ended")
  }

  private teardown(): void {
    if (this.mic !== null) {
      for (const track of this.mic.getTracks()) track.stop()
      this.mic = null
    }
    this.remoteStream = null
    if (this.pc !== null) {
      this.pc.close()
      this.pc = null
    }
    void AudioSession.stopAudioSession()
  }
}
