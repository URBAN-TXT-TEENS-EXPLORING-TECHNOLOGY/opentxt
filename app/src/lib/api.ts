import { Option, Schema } from "effect"
import { fetch as expoFetch } from "expo/fetch"

/**
 * Typed API client. Every response is decoded through an Effect Schema at the
 * I/O boundary (parse, don't validate) — a wrong server shape is rejected
 * here, never trusted into the UI. Streaming uses `expo/fetch`, which
 * supports response streaming natively (the old repo needed an
 * application/octet-stream workaround for iOS buffering; SDK 52+ made SSE
 * work properly).
 */

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ---------- schemas ----------

export const User = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
})
export type User = typeof User.Type

export const AuthResponse = Schema.Struct({
  token: Schema.String,
  user: User,
})
export type AuthResponse = typeof AuthResponse.Type

export const ChatSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  createdAt: Schema.Number,
})
export type ChatSummary = typeof ChatSummary.Type

const HistoryResponse = Schema.Struct({
  chats: Schema.Array(ChatSummary),
})

export const AttachmentRef = Schema.Struct({
  id: Schema.String,
  mime: Schema.String,
})
export type AttachmentRef = typeof AttachmentRef.Type

export const Message = Schema.Struct({
  id: Schema.String,
  role: Schema.Literals(["user", "assistant"]),
  content: Schema.String,
  attachments: Schema.NullOr(Schema.Array(AttachmentRef)),
  createdAt: Schema.Number,
})
export type Message = typeof Message.Type

const UploadResponse = Schema.Struct({
  id: Schema.String,
  mime: Schema.String,
  url: Schema.String,
})
export type UploadedMedia = typeof UploadResponse.Type

const ModelsResponse = Schema.Struct({
  default: Schema.String,
  models: Schema.Array(Schema.String),
})

const ChatDetailResponse = Schema.Struct({
  chat: ChatSummary,
  messages: Schema.Array(Message),
})
export type ChatDetail = typeof ChatDetailResponse.Type

const SttResponse = Schema.Struct({ text: Schema.String })

export const ConnectionDetails = Schema.Struct({
  serverUrl: Schema.String,
  roomName: Schema.String,
  participantName: Schema.String,
  participantToken: Schema.String,
})
export type ConnectionDetails = typeof ConnectionDetails.Type

const RealtimeSecret = Schema.Struct({
  clientSecret: Schema.String,
  expiresAt: Schema.NullOr(Schema.Number),
})
export type RealtimeSecret = typeof RealtimeSecret.Type

/** Server-sent events emitted by POST /api/chat. */
export const ChatEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("chat"), chatId: Schema.String }),
  Schema.Struct({ type: Schema.Literal("delta"), text: Schema.String }),
  Schema.Struct({ type: Schema.Literal("title"), title: Schema.String }),
  Schema.Struct({ type: Schema.Literal("done") }),
  Schema.Struct({ type: Schema.Literal("error"), message: Schema.String }),
])
export type ChatEvent = typeof ChatEvent.Type

const decodeChatEvent = Schema.decodeUnknownOption(ChatEvent)

// ---------- plumbing ----------

const decode = <S extends Schema.Top>(schema: S & { readonly DecodingServices: never }) => {
  const decoder = Schema.decodeUnknownOption(schema)
  return (input: unknown): S["Type"] => {
    const result = decoder(input)
    if (Option.isNone(result)) {
      throw new ApiError(0, "unexpected response shape from server")
    }
    return result.value
  }
}

const request = async <S extends Schema.Top>(
  path: string,
  schema: S & { readonly DecodingServices: never },
  init: { method?: string; token?: string; body?: string | FormData },
): Promise<S["Type"]> => {
  const headers: Record<string, string> = {}
  if (init.token !== undefined) headers["Authorization"] = `Bearer ${init.token}`
  if (typeof init.body === "string") headers["Content-Type"] = "application/json"
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body !== undefined ? { body: init.body } : {}),
  })
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : `request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return decode(schema)(json)
}

// ---------- endpoints ----------

export const api = {
  register: (email: string, password: string) =>
    request("/api/auth/register", AuthResponse, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signIn: (email: string, password: string) =>
    request("/api/auth/token", AuthResponse, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** One-tap throwaway account (can't be re-entered after sign-out). */
  guest: () =>
    request("/api/auth/guest", AuthResponse, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  history: (token: string) =>
    request("/api/history", HistoryResponse, { token }).then((r) => r.chats),

  chatDetail: (token: string, chatId: string) =>
    request(`/api/chat/${chatId}`, ChatDetailResponse, { token }),

  deleteChat: (token: string, chatId: string) =>
    request(`/api/chat/${chatId}`, Schema.Struct({ deleted: Schema.String }), {
      method: "DELETE",
      token,
    }),

  transcribe: async (token: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    // React Native FormData file part (uri-based) — not in the DOM lib types.
    form.append("file", file as unknown as Blob)
    const res = await request("/api/stt", SttResponse, { method: "POST", token, body: form })
    return res.text
  },

  /** Upload an image for multimodal chat; returns the media id + /m URL. */
  upload: (token: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    form.append("file", file as unknown as Blob)
    return request("/api/files/upload", UploadResponse, { method: "POST", token, body: form })
  },

  models: (token: string) => request("/api/models", ModelsResponse, { token }),

  // Voice endpoints take a chatId: the SERVER serializes the history
  // (ownership-checked) — the client can't inject fabricated context.
  voiceLiveKit: (token: string, chatId: string | undefined) =>
    request("/api/voice/livekit", ConnectionDetails, {
      method: "POST",
      token,
      body: JSON.stringify(chatId !== undefined ? { chatId } : {}),
    }),

  voiceRealtime: (token: string, chatId: string | undefined) =>
    request("/api/voice/realtime", RealtimeSecret, {
      method: "POST",
      token,
      body: JSON.stringify(chatId !== undefined ? { chatId } : {}),
    }),
} as const

/**
 * Stream one chat turn as parsed SSE events. Frames that don't decode
 * through `ChatEvent` are dropped at the boundary.
 */
export async function* streamChat(
  token: string,
  input: {
    chatId?: string
    message: string
    attachments?: ReadonlyArray<string>
    model?: string
  },
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await expoFetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(input),
    ...(signal !== undefined ? { signal } : {}),
  })
  if (!res.ok || res.body === null) {
    throw new ApiError(res.status, `chat stream failed (${res.status})`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let frameEnd = buffer.indexOf("\n\n")
      while (frameEnd !== -1) {
        const frame = buffer.slice(0, frameEnd)
        buffer = buffer.slice(frameEnd + 2)
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue
          let json: unknown
          try {
            json = JSON.parse(line.slice("data:".length).trim())
          } catch {
            continue
          }
          const event = decodeChatEvent(json)
          if (Option.isSome(event)) yield event.value
        }
        frameEnd = buffer.indexOf("\n\n")
      }
    }
  } finally {
    reader.releaseLock()
  }
}
