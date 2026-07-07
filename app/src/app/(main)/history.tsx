import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { api, type ChatSummary } from "@/lib/api"
import { useAuth, useAuthToken } from "@/lib/auth"
import { colors, radius, spacing } from "@/lib/theme"

export default function HistoryScreen() {
  const token = useAuthToken()
  const { signOut, user } = useAuth()
  const insets = useSafeAreaInsets()
  const [chats, setChats] = useState<ReadonlyArray<ChatSummary>>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .history(token)
      .then(setChats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [token])

  useEffect(load, [load])

  const remove = (id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id))
    api.deleteChat(token, id).catch(() => load())
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Chats</Text>
        <Pressable hitSlop={8} onPress={() => router.replace("/")}>
          <Ionicons name="create-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No chats yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.replace({ pathname: "/", params: { chat: item.id } })}
          >
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {item.title}
              </Text>
              <Text style={styles.rowDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => remove(item.id)}>
              <Ionicons name="trash-outline" size={18} color={colors.textDim} />
            </Pressable>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.signOut, { marginBottom: Math.max(insets.bottom, spacing.lg) }]}
        onPress={() => void signOut()}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.textDim} />
        <Text style={styles.signOutText}>Sign out{user !== null ? ` (${user.email})` : ""}</Text>
      </Pressable>
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
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  empty: {
    color: colors.textDim,
    marginTop: spacing.xxl,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  rowDate: {
    color: colors.textDim,
    fontSize: 12,
  },
  signOut: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  signOutText: {
    color: colors.textDim,
    fontSize: 14,
  },
})
