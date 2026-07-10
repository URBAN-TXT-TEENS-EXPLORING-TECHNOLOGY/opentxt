import { useCallback, useEffect, useRef, useState } from "react"
import { api, streamChat, type AttachmentRef } from "@/lib/api"
import { useAuthToken } from "@/lib/auth"

export type UiMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attachments: ReadonlyArray<AttachmentRef>
}

type ChatState = {
  chatId: string | null
  title: string
  messages: ReadonlyArray<UiMessage>
  streaming: boolean
  error: string | null
}

const EMPTY: ChatState = {
  chatId: null,
  title: "New chat",
  messages: [],
  streaming: false,
  error: null,
}

/**
 * One conversation's state machine: loads an existing chat when `chatId` is
 * given, sends turns through the SSE stream, and applies delta/title events
 * as they arrive.
 */
export function useChat(initialChatId: string | undefined) {
  const token = useAuthToken()
  const [state, setState] = useState<ChatState>(EMPTY)
  // Guards against a stale stream writing into a newer conversation.
  const generation = useRef(0)

  useEffect(() => {
    const gen = ++generation.current
    if (initialChatId === undefined) {
      setState(EMPTY)
      return
    }
    setState({ ...EMPTY, chatId: initialChatId })
    void api
      .chatDetail(token, initialChatId)
      .then((detail) => {
        if (generation.current !== gen) return
        setState({
          chatId: detail.chat.id,
          title: detail.chat.title,
          messages: detail.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachments: m.attachments ?? [],
          })),
          streaming: false,
          error: null,
        })
      })
      .catch((e: unknown) => {
        if (generation.current !== gen) return
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
      })
  }, [initialChatId, token])

  const send = useCallback(
    async (
      text: string,
      options?: { attachments?: ReadonlyArray<AttachmentRef>; model?: string },
    ) => {
      const message = text.trim()
      const attachments = options?.attachments ?? []
      if (message.length === 0) return
      const gen = generation.current
      const userMessage: UiMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: message,
        attachments,
      }
      const assistantId = `local-${Date.now()}-a`
      setState((s) => ({
        ...s,
        error: null,
        streaming: true,
        messages: [
          ...s.messages,
          userMessage,
          { id: assistantId, role: "assistant", content: "", attachments: [] },
        ],
      }))

      const applyAssistant = (f: (content: string) => string) => {
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: f(m.content) } : m,
          ),
        }))
      }

      try {
        const input = {
          message,
          ...(state.chatId !== null ? { chatId: state.chatId } : {}),
          ...(attachments.length > 0 ? { attachments: attachments.map((a) => a.id) } : {}),
          ...(options?.model !== undefined ? { model: options.model } : {}),
        }
        for await (const event of streamChat(token, input)) {
          if (generation.current !== gen) return
          switch (event.type) {
            case "chat":
              setState((s) => ({ ...s, chatId: event.chatId }))
              break
            case "delta":
              applyAssistant((content) => content + event.text)
              break
            case "title":
              setState((s) => ({ ...s, title: event.title }))
              break
            case "error":
              setState((s) => ({ ...s, error: event.message }))
              break
            case "done":
              break
          }
        }
      } catch (e) {
        if (generation.current === gen) {
          setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
        }
      } finally {
        if (generation.current === gen) {
          setState((s) => ({ ...s, streaming: false }))
        }
      }
    },
    [state.chatId, token],
  )

  return { ...state, send }
}
