import { createComponent, ssr, ssrHydrationKey, escape, ssrAttribute, ssrStyleProperty } from "solid-js/web";
import DOMPurify from "dompurify";
import { Option, Schema } from "effect";
import { marked } from "marked";
import { createSignal, onMount, createEffect, Show, For } from "solid-js";
var _tmpl$ = ["<select", ">", "</select>"], _tmpl$2 = ["<div", ' class="chat-error">', "</div>"], _tmpl$3 = ["<div", ' class="item">…</div>'], _tmpl$4 = ["<div", ' class="staged"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"], _tmpl$5 = ["<div", ' class="chat-shell"><aside class="sidebar"><button class="new-chat">+ New chat</button><ul>', '</ul><div class="foot"><span>opentxt web</span><button>sign out</button></div></aside><main class="main"><div class="topbar"><span class="title">', "</span><!--$-->", '<!--/--></div><div class="messages">', "</div><!--$-->", "<!--/--><!--$-->", '<!--/--><div class="input-bar"><input type="file" accept="image/*" style="', '"><button title="attach image">🖼</button><textarea rows="1" placeholder="Message opentxt"', '></textarea><button class="send"', ">↑</button></div></main></div>"], _tmpl$6 = ["<div", ' class="auth-error">', "</div>"], _tmpl$7 = ["<div", ' class="auth-wrap"><form class="auth-card"><h1>opentxt</h1><p>', '</p><input type="email" placeholder="email"', '><input type="password" placeholder="password"', "><!--$-->", '<!--/--><button type="submit"', ">", '</button><button type="button" class="switch">', "</button></form></div>"], _tmpl$8 = ["<li", ' class="', '"><span class="title">', '</span><button class="del" title="delete">✕</button></li>'], _tmpl$9 = ["<option", ">", "</option>"], _tmpl$0 = ["<div", ` class="empty"><b>What's on your mind?</b>Same account and history as the mobile app.</div>`], _tmpl$1 = ["<div", ' class="imgs">', "</div>"], _tmpl$10 = ["<div", ' class="md">', "</div>"], _tmpl$11 = ["<div", ' class="', '"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"], _tmpl$12 = ["<img", ' src="', '" alt="attachment">'], _tmpl$13 = ["<div", ' class="item"><img src="', '" alt="staged"><button class="rm">✕</button></div>'];
const id$$ = "src/routes/chat.tsx?pick=default&pick=$css";
const renderMarkdown = (content) => DOMPurify.sanitize(marked.parse(content, {
  async: false
}));
const ChatSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  createdAt: Schema.Number
});
const AttachmentRef = Schema.Struct({
  id: Schema.String,
  mime: Schema.String
});
const MessageRow = Schema.Struct({
  id: Schema.String,
  role: Schema.Literals(["user", "assistant"]),
  content: Schema.String,
  attachments: Schema.NullOr(Schema.Array(AttachmentRef)),
  createdAt: Schema.Number
});
Schema.decodeUnknownOption(Schema.Struct({
  token: Schema.String,
  user: Schema.Struct({
    id: Schema.String,
    email: Schema.String
  })
}));
const decodeHistory = Schema.decodeUnknownOption(Schema.Struct({
  chats: Schema.Array(ChatSummary)
}));
Schema.decodeUnknownOption(Schema.Struct({
  chat: ChatSummary,
  messages: Schema.Array(MessageRow)
}));
const decodeModels = Schema.decodeUnknownOption(Schema.Struct({
  default: Schema.String,
  models: Schema.Array(Schema.String)
}));
Schema.decodeUnknownOption(Schema.Struct({
  id: Schema.String,
  mime: Schema.String,
  url: Schema.String
}));
Schema.decodeUnknownOption(Schema.Union([Schema.Struct({
  type: Schema.Literal("chat"),
  chatId: Schema.String
}), Schema.Struct({
  type: Schema.Literal("delta"),
  text: Schema.String
}), Schema.Struct({
  type: Schema.Literal("title"),
  title: Schema.String
}), Schema.Struct({
  type: Schema.Literal("done")
}), Schema.Struct({
  type: Schema.Literal("error"),
  message: Schema.String
})]));
const TOKEN_KEY = "opentxt.token";
function ChatPage() {
  const [ready, setReady] = createSignal(false);
  const [token, setToken] = createSignal(null);
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [authMode, setAuthMode] = createSignal("signin");
  const [authError, setAuthError] = createSignal(null);
  const [authBusy, setAuthBusy] = createSignal(false);
  const [chats, setChats] = createSignal([]);
  const [chatId, setChatId] = createSignal(null);
  const [title, setTitle] = createSignal("New chat");
  const [messages, setMessages] = createSignal([]);
  const [streaming, setStreaming] = createSignal(false);
  const [chatError, setChatError] = createSignal(null);
  const [draft, setDraft] = createSignal("");
  const [models, setModels] = createSignal([]);
  const [model, setModel] = createSignal(null);
  const [staged, setStaged] = createSignal([]);
  const [uploading, setUploading] = createSignal(false);
  onMount(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setReady(true);
  });
  const authed = (init) => ({
    ...init,
    headers: {
      ...{},
      Authorization: `Bearer ${token() ?? ""}`,
      ...{}
    }
  });
  const loadHistory = async () => {
    const res = await fetch("/api/history", authed());
    if (res.status === 401) return signOut();
    const parsed = decodeHistory(await res.json());
    if (Option.isSome(parsed)) setChats(parsed.value.chats);
  };
  const loadModels = async () => {
    const res = await fetch("/api/models", authed());
    const parsed = decodeModels(await res.json().catch(() => null));
    if (Option.isSome(parsed)) {
      setModels(parsed.value.models);
      setModel(parsed.value.default);
    }
  };
  createEffect(() => {
    if (ready() && token() !== null) {
      void loadHistory();
      void loadModels();
    }
  });
  createEffect(() => {
    messages();
  });
  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setChats([]);
    newChat();
  };
  const newChat = () => {
    setChatId(null);
    setTitle("New chat");
    setMessages([]);
    setChatError(null);
    setStaged([]);
  };
  return createComponent(Show, {
    get when() {
      return ready();
    },
    get children() {
      return createComponent(Show, {
        get when() {
          return token() !== null;
        },
        get fallback() {
          return ssr(_tmpl$7, ssrHydrationKey(), authMode() === "signin" ? "Sign in to continue." : "Create an account (8+ character password).", ssrAttribute("value", escape(email(), true), false), ssrAttribute("value", escape(password(), true), false), escape(createComponent(Show, {
            get when() {
              return authError() !== null;
            },
            get children() {
              return ssr(_tmpl$6, ssrHydrationKey(), escape(authError()));
            }
          })), ssrAttribute("disabled", authBusy(), true), authMode() === "signin" ? "Sign in" : "Sign up", authMode() === "signin" ? "No account? Sign up" : "Have an account? Sign in");
        },
        get children() {
          return ssr(_tmpl$5, ssrHydrationKey(), escape(createComponent(For, {
            get each() {
              return chats();
            },
            children: (c) => ssr(_tmpl$8, ssrHydrationKey(), chatId() === c.id ? "active" : "", escape(c.title))
          })), escape(title()), escape(createComponent(Show, {
            get when() {
              return models().length > 0;
            },
            get children() {
              return ssr(_tmpl$, ssrHydrationKey() + ssrAttribute("value", escape(model() ?? "", true), false), escape(createComponent(For, {
                get each() {
                  return models();
                },
                children: (m) => ssr(_tmpl$9, ssrHydrationKey() + ssrAttribute("value", escape(m, true), false), escape(m))
              })));
            }
          })), escape(createComponent(Show, {
            get when() {
              return messages().length > 0;
            },
            get fallback() {
              return ssr(_tmpl$0, ssrHydrationKey());
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return messages();
                },
                children: (m) => ssr(_tmpl$11, ssrHydrationKey(), `${escape(`msg ${m.role}` || "", true)} ${m.role === "assistant" && m.content.length === 0 && streaming() ? "pending" : ""}`, escape(createComponent(Show, {
                  get when() {
                    return m.attachments.length > 0;
                  },
                  get children() {
                    return ssr(_tmpl$1, ssrHydrationKey(), escape(createComponent(For, {
                      get each() {
                        return m.attachments;
                      },
                      children: (a) => ssr(_tmpl$12, ssrHydrationKey(), `/m/${escape(a.id, true)}`)
                    })));
                  }
                })), escape(createComponent(Show, {
                  get when() {
                    return m.role === "assistant";
                  },
                  get fallback() {
                    return m.content;
                  },
                  get children() {
                    return ssr(_tmpl$10, ssrHydrationKey(), renderMarkdown(m.content));
                  }
                })))
              });
            }
          })), escape(createComponent(Show, {
            get when() {
              return chatError() !== null;
            },
            get children() {
              return ssr(_tmpl$2, ssrHydrationKey(), escape(chatError()));
            }
          })), escape(createComponent(Show, {
            get when() {
              return staged().length > 0 || uploading();
            },
            get children() {
              return ssr(_tmpl$4, ssrHydrationKey(), escape(createComponent(For, {
                get each() {
                  return staged();
                },
                children: (a) => ssr(_tmpl$13, ssrHydrationKey(), `/m/${escape(a.id, true)}`)
              })), escape(createComponent(Show, {
                get when() {
                  return uploading();
                },
                get children() {
                  return ssr(_tmpl$3, ssrHydrationKey());
                }
              })));
            }
          })), ssrStyleProperty("display:", "none"), ssrAttribute("value", escape(draft(), true), false), ssrAttribute("disabled", streaming() || uploading() || draft().trim().length === 0, true));
        }
      });
    }
  });
}
export {
  ChatPage as default,
  id$$
};
//# sourceMappingURL=chat-DQT2yb3F.js.map
