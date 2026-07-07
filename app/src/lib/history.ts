import { api } from "./api"

/** Cap so the serialized history fits comfortably in a LiveKit participant
 *  attribute / Realtime instructions string. */
const MAX_HISTORY_CHARS = 6000

/**
 * Serialize a chat's recent messages for the voice context bridge — both
 * voice modes seed their session instructions with this so the assistant
 * remembers the text conversation.
 */
export async function serializeHistory(token: string, chatId: string | undefined): Promise<string> {
  if (chatId === undefined) return ""
  try {
    const detail = await api.chatDetail(token, chatId)
    const compact = detail.messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    return compact.length > MAX_HISTORY_CHARS ? compact.slice(-MAX_HISTORY_CHARS) : compact
  } catch {
    // Voice without context beats no voice at all.
    return ""
  }
}
