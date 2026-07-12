import DOMPurify from "dompurify"
import { Option, Schema } from "effect"
import { marked } from "marked"
import { createEffect, createSignal, For, onMount, Show } from "solid-js"
import "./chat.css"

/**
 * Web chat — a Solid-reactive client for the same API the Expo app uses
 * (Bearer JWT + SSE). Serves as the browser QA surface; the mobile app is
 * the product. Assistant markdown renders via marked + DOMPurify (model
 * output is untrusted — prompt injection could smuggle HTML).
 */

/** Assistant markdown -> sanitized HTML. Client-only (DOMPurify needs a DOM);
 *  messages only exist client-side, so SSR never calls this. */
const renderMarkdown = (content: string): string =>
  DOMPurify.sanitize(marked.parse(content, { async: false }))

// ---- schemas (parse, don't trust — same boundary rule as the app) ----

const ChatSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  createdAt: Schema.Number,
})
type ChatSummary = typeof ChatSummary.Type

const AttachmentRef = Schema.Struct({ id: Schema.String, mime: Schema.String })
type AttachmentRef = typeof AttachmentRef.Type

const MessageRow = Schema.Struct({
  id: Schema.String,
  role: Schema.Literals(["user", "assistant"]),
  content: Schema.String,
  attachments: Schema.NullOr(Schema.Array(AttachmentRef)),
  createdAt: Schema.Number,
})

const decodeAuth = Schema.decodeUnknownOption(
  Schema.Struct({
    token: Schema.String,
    user: Schema.Struct({ id: Schema.String, email: Schema.String }),
  }),
)
const decodeHistory = Schema.decodeUnknownOption(
  Schema.Struct({ chats: Schema.Array(ChatSummary) }),
)
const decodeDetail = Schema.decodeUnknownOption(
  Schema.Struct({ chat: ChatSummary, messages: Schema.Array(MessageRow) }),
)
const decodeModels = Schema.decodeUnknownOption(
  Schema.Struct({ default: Schema.String, models: Schema.Array(Schema.String) }),
)
const decodeUpload = Schema.decodeUnknownOption(
  Schema.Struct({ id: Schema.String, mime: Schema.String, url: Schema.String }),
)
const decodeEvent = Schema.decodeUnknownOption(
  Schema.Union([
    Schema.Struct({ type: Schema.Literal("chat"), chatId: Schema.String }),
    Schema.Struct({ type: Schema.Literal("delta"), text: Schema.String }),
    Schema.Struct({ type: Schema.Literal("title"), title: Schema.String }),
    Schema.Struct({ type: Schema.Literal("done") }),
    Schema.Struct({ type: Schema.Literal("error"), message: Schema.String }),
  ]),
)

type UiMsg = {
  id: string
  role: "user" | "assistant"
  content: string
  attachments: ReadonlyArray<AttachmentRef>
}

const TOKEN_KEY = "opentxt.token"

export default function ChatPage() {
  // ---- session ----
  const [ready, setReady] = createSignal(false)
  const [token, setToken] = createSignal<string | null>(null)
  const [email, setEmail] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [authMode, setAuthMode] = createSignal<"signin" | "signup">("signin")
  const [authError, setAuthError] = createSignal<string | null>(null)
  const [authBusy, setAuthBusy] = createSignal(false)

  // ---- chat state ----
  const [chats, setChats] = createSignal<ReadonlyArray<ChatSummary>>([])
  const [chatId, setChatId] = createSignal<string | null>(null)
  const [title, setTitle] = createSignal("New chat")
  const [messages, setMessages] = createSignal<ReadonlyArray<UiMsg>>([])
  const [streaming, setStreaming] = createSignal(false)
  const [chatError, setChatError] = createSignal<string | null>(null)
  const [draft, setDraft] = createSignal("")
  const [models, setModels] = createSignal<ReadonlyArray<string>>([])
  const [model, setModel] = createSignal<string | null>(null)
  const [staged, setStaged] = createSignal<ReadonlyArray<AttachmentRef>>([])
  const [uploading, setUploading] = createSignal(false)

  let messagesEl: HTMLDivElement | undefined
  let fileEl: HTMLInputElement | undefined

  onMount(() => {
    setToken(localStorage.getItem(TOKEN_KEY))
    setReady(true)
  })

  const authed = (init?: RequestInit): RequestInit => ({
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token() ?? ""}`,
      ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
    },
  })

  const loadHistory = async () => {
    const res = await fetch("/api/history", authed())
    if (res.status === 401) return signOut()
    const parsed = decodeHistory(await res.json())
    if (Option.isSome(parsed)) setChats(parsed.value.chats)
  }

  const loadModels = async () => {
    const res = await fetch("/api/models", authed())
    const parsed = decodeModels(await res.json().catch(() => null))
    if (Option.isSome(parsed)) {
      setModels(parsed.value.models)
      setModel(parsed.value.default)
    }
  }

  createEffect(() => {
    if (ready() && token() !== null) {
      void loadHistory()
      void loadModels()
    }
  })

  // Pin the scroll to the newest message while streaming.
  createEffect(() => {
    messages()
    if (messagesEl !== undefined) messagesEl.scrollTop = messagesEl.scrollHeight
  })

  const submitAuth = async (e: Event) => {
    e.preventDefault()
    if (authBusy()) return
    setAuthBusy(true)
    setAuthError(null)
    try {
      const path = authMode() === "signin" ? "/api/auth/token" : "/api/auth/register"
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email().trim().toLowerCase(), password: password() }),
      })
      const json: unknown = await res.json()
      const parsed = decodeAuth(json)
      if (!res.ok || Option.isNone(parsed)) {
        const message =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as { error: unknown }).error)
            : `failed (${res.status})`
        setAuthError(message)
        return
      }
      localStorage.setItem(TOKEN_KEY, parsed.value.token)
      setToken(parsed.value.token)
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setChats([])
    newChat()
  }

  const newChat = () => {
    setChatId(null)
    setTitle("New chat")
    setMessages([])
    setChatError(null)
    setStaged([])
  }

  const openChat = async (id: string) => {
    const res = await fetch(`/api/chat/${id}`, authed())
    const parsed = decodeDetail(await res.json().catch(() => null))
    if (Option.isNone(parsed)) return
    setChatId(parsed.value.chat.id)
    setTitle(parsed.value.chat.title)
    setChatError(null)
    setStaged([])
    setMessages(
      parsed.value.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        attachments: m.attachments ?? [],
      })),
    )
  }

  const deleteChat = async (id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id))
    if (chatId() === id) newChat()
    await fetch(`/api/chat/${id}`, authed({ method: "DELETE" }))
  }

  const pickFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    if (file === undefined) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/files/upload", authed({ method: "POST", body: form }))
      const parsed = decodeUpload(await res.json().catch(() => null))
      if (Option.isSome(parsed)) {
        setStaged((s) => [...s, { id: parsed.value.id, mime: parsed.value.mime }])
      }
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    const text = draft().trim()
    if (text.length === 0 || streaming()) return
    const attachments = staged()
    setDraft("")
    setStaged([])
    setChatError(null)
    setStreaming(true)

    const assistantId = `local-${Date.now()}-a`
    setMessages((ms) => [
      ...ms,
      { id: `local-${Date.now()}`, role: "user", content: text, attachments },
      { id: assistantId, role: "assistant", content: "", attachments: [] },
    ])
    const appendDelta = (delta: string) =>
      setMessages((ms) =>
        ms.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
      )

    try {
      const res = await fetch("/api/chat", {
        ...authed({ method: "POST" }),
        headers: {
          Authorization: `Bearer ${token() ?? ""}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: text,
          ...(chatId() !== null ? { chatId: chatId() } : {}),
          ...(attachments.length > 0 ? { attachments: attachments.map((a) => a.id) } : {}),
          ...(model() !== null ? { model: model() } : {}),
        }),
      })
      if (!res.ok || res.body === null) {
        setChatError(`chat failed (${res.status})`)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
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
            const event = decodeEvent(json)
            if (Option.isNone(event)) continue
            switch (event.value.type) {
              case "chat":
                setChatId(event.value.chatId)
                break
              case "delta":
                appendDelta(event.value.text)
                break
              case "title":
                setTitle(event.value.title)
                break
              case "error":
                setChatError(event.value.message)
                break
              case "done":
                break
            }
          }
          frameEnd = buffer.indexOf("\n\n")
        }
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e))
    } finally {
      setStreaming(false)
      void loadHistory()
    }
  }

  return (
    <Show when={ready()}>
      <Show
        when={token() !== null}
        fallback={
          <div class="auth-wrap">
            <form class="auth-card" onSubmit={(e) => void submitAuth(e)}>
              <h1>opentxt</h1>
              <p>
                {authMode() === "signin"
                  ? "Sign in to continue."
                  : "Create an account (8+ character password)."}
              </p>
              <input
                type="email"
                placeholder="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
              <input
                type="password"
                placeholder="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
              <Show when={authError() !== null}>
                <div class="auth-error">{authError()}</div>
              </Show>
              <button type="submit" disabled={authBusy()}>
                {authMode() === "signin" ? "Sign in" : "Sign up"}
              </button>
              <button
                type="button"
                class="switch"
                onClick={() => setAuthMode(authMode() === "signin" ? "signup" : "signin")}
              >
                {authMode() === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
              </button>
            </form>
          </div>
        }
      >
        <div class="chat-shell">
          <aside class="sidebar">
            <button class="new-chat" onClick={newChat}>
              + New chat
            </button>
            <ul>
              <For each={chats()}>
                {(c) => (
                  <li
                    classList={{ active: chatId() === c.id }}
                    onClick={() => void openChat(c.id)}
                  >
                    <span class="title">{c.title}</span>
                    <button
                      class="del"
                      title="delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        void deleteChat(c.id)
                      }}
                    >
                      ✕
                    </button>
                  </li>
                )}
              </For>
            </ul>
            <div class="foot">
              <span>opentxt web</span>
              <button onClick={signOut}>sign out</button>
            </div>
          </aside>

          <main class="main">
            <div class="topbar">
              <span class="title">{title()}</span>
              <Show when={models().length > 0}>
                <select
                  value={model() ?? ""}
                  onChange={(e) => setModel(e.currentTarget.value)}
                >
                  <For each={models()}>{(m) => <option value={m}>{m}</option>}</For>
                </select>
              </Show>
            </div>

            <div class="messages" ref={messagesEl}>
              <Show
                when={messages().length > 0}
                fallback={
                  <div class="empty">
                    <b>What's on your mind?</b>
                    Same account and history as the mobile app.
                  </div>
                }
              >
                <For each={messages()}>
                  {(m) => (
                    <div
                      class={`msg ${m.role}`}
                      classList={{
                        pending: m.role === "assistant" && m.content.length === 0 && streaming(),
                      }}
                    >
                      <Show when={m.attachments.length > 0}>
                        <div class="imgs">
                          <For each={m.attachments}>
                            {(a) => <img src={`/m/${a.id}`} alt="attachment" />}
                          </For>
                        </div>
                      </Show>
                      <Show when={m.role === "assistant"} fallback={m.content}>
                        <div class="md" innerHTML={renderMarkdown(m.content)} />
                      </Show>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            <Show when={chatError() !== null}>
              <div class="chat-error">{chatError()}</div>
            </Show>

            <Show when={staged().length > 0 || uploading()}>
              <div class="staged">
                <For each={staged()}>
                  {(a) => (
                    <div class="item">
                      <img src={`/m/${a.id}`} alt="staged" />
                      <button
                        class="rm"
                        onClick={() => setStaged((s) => s.filter((x) => x.id !== a.id))}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </For>
                <Show when={uploading()}>
                  <div class="item">…</div>
                </Show>
              </div>
            </Show>

            <div class="input-bar">
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={fileEl}
                onChange={(e) => void pickFile(e)}
              />
              <button title="attach image" onClick={() => fileEl?.click()}>
                🖼
              </button>
              <textarea
                rows={1}
                placeholder="Message opentxt"
                value={draft()}
                onInput={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <button
                class="send"
                disabled={streaming() || uploading() || draft().trim().length === 0}
                onClick={() => void send()}
              >
                ↑
              </button>
            </div>
          </main>
        </div>
      </Show>
    </Show>
  )
}
