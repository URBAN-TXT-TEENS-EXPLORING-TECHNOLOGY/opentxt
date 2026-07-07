import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { colors } from "@/lib/theme"

export type OrbMode = "idle" | "listening" | "thinking" | "speaking"

const MODE_COLOR: Record<OrbMode, string> = {
  idle: colors.border,
  listening: colors.accent,
  thinking: colors.textDim,
  speaking: colors.live,
}

const MODE_PULSE_MS: Record<OrbMode, number> = {
  idle: 2400,
  listening: 1400,
  thinking: 700,
  speaking: 450,
}

/** The voice-session centerpiece: a breathing orb, color/tempo keyed to state. */
export function VoiceOrb(props: { mode: OrbMode }) {
  const scale = useSharedValue(1)

  useEffect(() => {
    cancelAnimation(scale)
    scale.value = 1
    scale.value = withRepeat(
      withTiming(props.mode === "idle" ? 1.04 : 1.18, { duration: MODE_PULSE_MS[props.mode] }),
      -1,
      true,
    )
  }, [props.mode, scale])

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.orb, animated, { backgroundColor: MODE_COLOR[props.mode] }]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    height: 220,
    justifyContent: "center",
  },
  orb: {
    borderRadius: 90,
    height: 180,
    opacity: 0.9,
    width: 180,
  },
})
