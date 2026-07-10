import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Markdown } from "@/components/markdown"
import { useChat, type UiMessage } from "@/hooks/use-chat"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { colors, radius, spacing } from "@/lib/theme"

export default function ChatScreen() {
  const params = useLocalSearchParams<{ chat?: string }>()
  const chat = useChat(params.chat)
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState("")
  const listRef = useRef<FlatList<UiMessage>>(null)
  const voice = useVoiceInput((text) => setDraft((d) => (d.length > 0 ? `${d} ${text}` : text)))

  const sendDraft = () => {
    const text = draft
    setDraft("")
    void chat.send(text)
  }

  const voiceHref = (mode: "voice-livekit" | "voice-realtime") => {
    router.push({
      pathname: `/${mode}`,
      params: chat.chatId !== null ? { chat: chat.chatId } : {},
    })
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.push("/history")}>
          <Ionicons name="menu-outline" size={26} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {chat.title}
        </Text>
        <View style={styles.headerActions}>
          <Pressable hitSlop={8} onPress={() => voiceHref("voice-livekit")}>
            <Ionicons name="call-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => voiceHref("voice-realtime")}>
            <Ionicons name="flash-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={chat.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>What's on your mind?</Text>
            <Text style={styles.emptyText}>
              Text below, dictate with the mic, or start a live voice call from the header.
            </Text>
          </View>
        }
        renderItem={({ item }) => <Bubble message={item} streaming={chat.streaming} />}
      />

      {chat.error !== null && <Text style={styles.error}>{chat.error}</Text>}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          style={styles.input}
          placeholder={voice.transcribing ? "transcribing…" : "Message opentxt"}
          placeholderTextColor={colors.textDim}
          value={draft}
          onChangeText={setDraft}
          multiline
          editable={!voice.transcribing}
        />
        <Pressable
          hitSlop={8}
          style={[styles.iconButton, voice.recording && styles.iconButtonActive]}
          onPress={() => void (voice.recording ? voice.stop() : voice.start())}
        >
          {voice.transcribing ? (
            <ActivityIndicator size="small" color={colors.textDim} />
          ) : (
            <Ionicons
              name={voice.recording ? "stop" : "mic-outline"}
              size={22}
              color={voice.recording ? colors.danger : colors.text}
            />
          )}
        </Pressable>
        <Pressable
          hitSlop={8}
          style={[styles.iconButton, styles.sendButton]}
          onPress={sendDraft}
          disabled={chat.streaming || draft.trim().length === 0}
        >
          <Ionicons name="arrow-up" size={22} color={colors.accentText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function Bubble(props: { message: UiMessage; streaming: boolean }) {
  const isUser = props.message.role === "user"
  const pending = !isUser && props.message.content.length === 0
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {pending ? (
        <ActivityIndicator size="small" color={colors.textDim} />
      ) : isUser ? (
        <Text style={styles.bubbleText}>{props.message.content}</Text>
      ) : (
        <Markdown>{props.message.content}</Markdown>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
  },
  bubble: {
    borderRadius: radius.lg,
    maxWidth: "85%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inputBar: {
    alignItems: "flex-end",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconButtonActive: {
    backgroundColor: colors.surfaceRaised,
  },
  sendButton: {
    backgroundColor: colors.accent,
  },
})
