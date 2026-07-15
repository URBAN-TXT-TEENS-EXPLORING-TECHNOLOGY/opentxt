import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Markdown } from "@/components/markdown"
import { useChat, type UiMessage } from "@/hooks/use-chat"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { api, BASE_URL, type AttachmentRef } from "@/lib/api"
import { useAuthToken } from "@/lib/auth"
import { colors, radius, spacing } from "@/lib/theme"

export default function ChatScreen() {
  const params = useLocalSearchParams<{ chat?: string }>()
  const token = useAuthToken()
  const chat = useChat(params.chat)
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState("")
  const [staged, setStaged] = useState<ReadonlyArray<AttachmentRef>>([])
  const [uploading, setUploading] = useState(false)
  const [models, setModels] = useState<ReadonlyArray<string>>([])
  const [model, setModel] = useState<string | null>(null)
  const listRef = useRef<FlatList<UiMessage>>(null)
  const voice = useVoiceInput((text) => setDraft((d) => (d.length > 0 ? `${d} ${text}` : text)))

  useEffect(() => {
    api
      .models(token)
      .then((m) => {
        setModels(m.models)
        setModel(m.default)
      })
      .catch(() => {}) // header pill just stays hidden
  }, [token])

  const cycleModel = () => {
    if (model === null || models.length < 2) return
    const next = models[(models.indexOf(model) + 1) % models.length]
    if (next !== undefined) setModel(next)
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    })
    const asset = result.assets?.[0]
    if (result.canceled || asset === undefined) return
    setUploading(true)
    try {
      const uploaded = await api.upload(token, {
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: asset.mimeType ?? "image/jpeg",
      })
      setStaged((s) => [...s, { id: uploaded.id, mime: uploaded.mime }])
    } catch {
      // drop silently; the user can retry
    } finally {
      setUploading(false)
    }
  }

  const sendDraft = () => {
    const text = draft
    const attachments = staged
    setDraft("")
    setStaged([])
    void chat.send(text, {
      attachments,
      ...(model !== null ? { model } : {}),
    })
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
        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {chat.title}
          </Text>
          {model !== null && (
            <Pressable onPress={cycleModel} hitSlop={6}>
              <Text style={styles.modelPill}>{model}</Text>
            </Pressable>
          )}
        </View>
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

      {(staged.length > 0 || uploading) && (
        <ScrollView horizontal style={styles.stagedRow} contentContainerStyle={styles.stagedContent}>
          {staged.map((a) => (
            <View key={a.id} style={styles.stagedItem}>
              <Image source={{ uri: `${BASE_URL}/m/${a.id}` }} style={styles.stagedImage} />
              <Pressable
                style={styles.stagedRemove}
                hitSlop={6}
                onPress={() => setStaged((s) => s.filter((x) => x.id !== a.id))}
              >
                <Ionicons name="close" size={12} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {uploading && (
            <View style={[styles.stagedItem, styles.stagedUploading]}>
              <ActivityIndicator size="small" color={colors.textDim} />
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable hitSlop={8} style={styles.iconButton} onPress={() => void pickImage()}>
          <Ionicons name="image-outline" size={22} color={colors.text} />
        </Pressable>
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
        {chat.streaming ? (
          <Pressable hitSlop={8} style={[styles.iconButton, styles.stopButton]} onPress={chat.stop}>
            <Ionicons name="stop" size={18} color={colors.text} />
          </Pressable>
        ) : (
          <Pressable
            hitSlop={8}
            style={[styles.iconButton, styles.sendButton]}
            onPress={sendDraft}
            disabled={uploading || draft.trim().length === 0}
          >
            <Ionicons name="arrow-up" size={22} color={colors.accentText} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

function Bubble(props: { message: UiMessage; streaming: boolean }) {
  const isUser = props.message.role === "user"
  const pending = !isUser && props.message.content.length === 0
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {props.message.attachments.length > 0 && (
        <View style={styles.bubbleImages}>
          {props.message.attachments.map((a) => (
            <Image
              key={a.id}
              source={{ uri: `${BASE_URL}/m/${a.id}` }}
              style={styles.bubbleImage}
              contentFit="cover"
            />
          ))}
        </View>
      )}
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
  headerCenter: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modelPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    color: colors.textDim,
    fontSize: 11,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  stagedRow: {
    flexGrow: 0,
  },
  stagedContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  stagedItem: {
    borderRadius: radius.sm,
    height: 56,
    overflow: "hidden",
    width: 56,
  },
  stagedUploading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  stagedImage: {
    height: "100%",
    width: "100%",
  },
  stagedRemove: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radius.pill,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: 2,
    width: 18,
  },
  bubbleImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bubbleImage: {
    borderRadius: radius.sm,
    height: 140,
    width: 140,
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
  stopButton: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
})
