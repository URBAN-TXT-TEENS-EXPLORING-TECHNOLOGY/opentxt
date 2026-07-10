import { useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { StyleSheet, Text } from "react-native"
import { MuteButton, Shell } from "./voice-livekit"
import type { OrbMode } from "@/components/voice-orb"
import { VoiceOrb } from "@/components/voice-orb"
import { api } from "@/lib/api"
import { useAuthToken } from "@/lib/auth"
import { RealtimeVoiceSession, type RealtimeStatus } from "@/lib/realtime"
import { colors, spacing } from "@/lib/theme"

/**
 * Direct OpenAI Realtime voice mode: WebRTC straight from the device to
 * OpenAI (`/v1/realtime/calls`), authenticated with a server-minted ephemeral
 * secret. No LiveKit infrastructure involved — the second of the two voice
 * paths this app implements.
 */
export default function VoiceRealtimeScreen() {
  const token = useAuthToken()
  const params = useLocalSearchParams<{ chat?: string }>()
  const [status, setStatus] = useState<RealtimeStatus>("connecting")
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const session = useRef<RealtimeVoiceSession | null>(null)

  useEffect(() => {
    const s = new RealtimeVoiceSession({
      onStatus: setStatus,
      onTranscript: (delta, done) => {
        if (done) {
          setSpeaking(false)
        } else {
          setSpeaking(true)
          setTranscript((t) => (t + delta).slice(-600))
        }
      },
    })
    session.current = s
    void (async () => {
      try {
        const secret = await api.voiceRealtime(token, params.chat)
        await s.start(secret.clientSecret)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      s.end()
      session.current = null
    }
  }, [token, params.chat])

  const mode: OrbMode =
    status === "connecting" ? "thinking" : status !== "live" ? "idle" : speaking ? "speaking" : "listening"

  return (
      <Shell error={error}>
      <VoiceOrb mode={mode} />
      <Text style={styles.status}>{status === "live" ? (speaking ? "speaking" : "listening") : status}</Text>
      {status === "live" && (
        <MuteButton
          muted={muted}
          onToggle={() => {
            const next = !muted
            session.current?.setMuted(next)
            setMuted(next)
          }}
        />
      )}
      {transcript.length > 0 && (
        <Text numberOfLines={4} style={styles.transcript}>
          {transcript}
        </Text>
      )}
    </Shell>
  )
}

const styles = StyleSheet.create({
  status: {
    color: colors.textDim,
    fontSize: 14,
  },
  transcript: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
    textAlign: "center",
  },
})
