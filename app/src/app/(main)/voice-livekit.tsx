import { useLocalParticipant, useVoiceAssistant } from "@livekit/components-react"
import { AudioSession, LiveKitRoom } from "@livekit/react-native"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { VoiceOrb, type OrbMode } from "@/components/voice-orb"
import { api, type ConnectionDetails } from "@/lib/api"
import { useAuthToken } from "@/lib/auth"
import { colors, spacing } from "@/lib/theme"

/**
 * LiveKit voice mode: joins a room minted by the server; the Node agent
 * worker (opentxt/agent) is dispatched by LiveKit and answers via the OpenAI
 * Realtime model. Chat history rides in the participant token attributes.
 */
export default function VoiceLiveKitScreen() {
  const token = useAuthToken()
  const params = useLocalSearchParams<{ chat?: string }>()
  const [details, setDetails] = useState<ConnectionDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        await AudioSession.startAudioSession()
        const d = await api.voiceLiveKit(token, params.chat)
        if (active) setDetails(d)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      active = false
      void AudioSession.stopAudioSession()
    }
  }, [token, params.chat])

  return (
    <Shell error={error} mode={details === null ? "thinking" : undefined}>
      {details !== null && (
        <LiveKitRoom
          serverUrl={details.serverUrl}
          token={details.participantToken}
          connect
          audio
          video={false}
        >
          <AssistantOrb />
        </LiveKitRoom>
      )}
    </Shell>
  )
}

function AssistantOrb() {
  const { state } = useVoiceAssistant()
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant()
  const mode: OrbMode =
    state === "listening" || state === "thinking" || state === "speaking" ? state : "idle"
  return (
    <>
      <VoiceOrb mode={mode} />
      <Text style={styles.state}>{state}</Text>
      <MuteButton
        muted={!isMicrophoneEnabled}
        onToggle={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      />
    </>
  )
}

/** Shared mic toggle for both voice screens. */
export function MuteButton(props: { muted: boolean; onToggle: () => void }) {
  return (
    <Pressable
      style={[styles.mute, props.muted && styles.muteActive]}
      onPress={props.onToggle}
    >
      <Ionicons
        name={props.muted ? "mic-off" : "mic"}
        size={20}
        color={props.muted ? colors.danger : colors.text}
      />
      <Text style={styles.muteText}>{props.muted ? "Unmute" : "Mute"}</Text>
    </Pressable>
  )
}

/** Shared chrome for the voice screens (title, orb area, end button). */
export function Shell(props: {
  error: string | null
  mode?: OrbMode | undefined
  children?: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>Voice</Text>
      <View style={styles.center}>
        {props.error !== null ? (
          <Text style={styles.error}>{props.error}</Text>
        ) : (
          (props.children ?? <VoiceOrb mode={props.mode ?? "idle"} />)
        )}
      </View>
      <Pressable style={styles.end} onPress={() => router.back()}>
        <Ionicons name="close" size={22} color={colors.text} />
        <Text style={styles.endText}>End</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  title: {
    color: colors.textDim,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  center: {
    alignItems: "center",
    gap: spacing.lg,
    justifyContent: "center",
  },
  state: {
    color: colors.textDim,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.xl,
    textAlign: "center",
  },
  end: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  mute: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  muteActive: {
    borderColor: colors.danger,
  },
  muteText: {
    color: colors.text,
    fontSize: 13,
  },
  endText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
})
