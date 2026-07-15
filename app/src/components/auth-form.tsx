import { Link, type Href } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { colors, radius, spacing } from "@/lib/theme"

type Props = {
  title: string
  subtitle: string
  actionLabel: string
  onSubmit: (email: string, password: string) => Promise<void>
  onGuest?: (() => Promise<void>) | undefined
  footerText: string
  footerLinkLabel: string
  footerHref: Href
}

/** Shared email+password form for the sign-in and sign-up screens. */
export function AuthForm(props: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await props.onSubmit(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.subtitle}>{props.subtitle}</Text>

        <TextInput
          style={styles.input}
          placeholder="email"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="password (8+ characters)"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => void submit()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonLabel}>{props.actionLabel}</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{props.footerText} </Text>
          <Link href={props.footerHref}>
            <Text style={styles.footerLink}>{props.footerLinkLabel}</Text>
          </Link>
        </View>

        {props.onGuest !== undefined && (
          <Pressable
            style={styles.guest}
            disabled={busy}
            onPress={() => {
              if (busy) return
              setBusy(true)
              setError(null)
              props
                .onGuest?.()
                .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                .finally(() => setBusy(false))
            }}
          >
            <Text style={styles.guestText}>Continue as guest</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textDim,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: "600",
  },
  guest: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  guestText: {
    color: colors.textDim,
    fontSize: 14,
    textDecorationLine: "underline",
  },
})
