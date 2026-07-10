# opentxt

A type-safe, Effect-native rewrite of [`chatbot-nextjs-expo-livekit`](../chatbot-nextjs-expo-livekit):
AI text chat + two live voice modes, with the Python voice agent replaced by TypeScript.

```
opentxt/
├── server/   SolidStart 2 + Effect v4 backend (API + SQLite), port 3000
├── agent/    LiveKit Agents (Node) worker — OpenAI Realtime speech-to-speech
└── app/      Expo SDK 57 client (dev build; Expo Go won't run LiveKit/WebRTC)
```

## What replaced what

| Original | Here | Why |
| --- | --- | --- |
| Next.js 16 + AI SDK v5 + NextAuth + Drizzle/Postgres | SolidStart 2 (alpha) + Effect 4 (beta) + `node:sqlite` | mochi/core's proven stack; Effect services + `Schema` at every I/O boundary |
| Python `livekit-agents` (Deepgram STT → gpt-4o-mini → Cartesia TTS → Silero VAD → turn detector) | `@livekit/agents` (Node) with the OpenAI **Realtime** model (`gpt-realtime`, GA) | one speech-to-speech socket replaces 3 vendors + VAD + turn detection; no Python |
| — (didn't exist) | Direct OpenAI Realtime over WebRTC from the app | second voice mode: GA `client_secrets` + `/v1/realtime/calls`, no LiveKit infra needed |
| 3 auth systems (NextAuth web sessions, hand-rolled mobile JWT, User-Agent sniffing middleware) | ONE Bearer-token scheme (jose HS256, scrypt passwords) | explicit > sniffed; every client authenticates the same way |
| `application/octet-stream` iOS streaming workaround | plain SSE + `expo/fetch` | expo/fetch streams natively since SDK 52 |

## Architecture

```
┌──────────────┐   Bearer JWT    ┌───────────────────────────────┐
│  Expo app    │ ──────────────► │  server (SolidStart + Effect)  │
│  (SDK 57)    │   SSE /api/chat │  Db · Auth · Ai · LiveKitVoice │
│              │                 │  · OpenAiRealtime (services)   │
│  voice modes:│                 └──────┬──────────────┬─────────┘
│              │                        │              │
│  1) LiveKit ─┼── WebRTC ─► LiveKit ◄──┼─ dispatches ─┤ mints room token
│              │            room        │              │ (history in attrs)
│              │              ▲   ┌─────▼─────┐        │
│              │              └───┤ agent/    │        │
│              │                  │ gpt-realtime       │
│  2) Realtime─┼── WebRTC ─────────────────► OpenAI    │ mints ephemeral
│              │   /v1/realtime/calls        Realtime ◄┘ client secret
└──────────────┘                             (GA)
```

- **Effect discipline** (from the workspace type-safety principle): `db.ts` is the ONLY
  module importing the SQLite driver; every write goes through `Schema.encodeEffect`,
  every read through `Schema.decodeUnknownEffect`. Services are `Context.Service`
  classes with `Layer.effect` layers, composed in one `ManagedRuntime`
  (`src/server/runtime.ts`) with SIGTERM/SIGINT disposal.
- **Streaming**: the chat route is an Effect `Stream` end-to-end — upstream OpenAI SSE →
  `Stream.decodeText` → `splitLines` → schema-parsed deltas → re-framed SSE →
  `Stream.toReadableStreamEffect`. Assistant persistence is a stream FINALIZER
  (`Stream.ensuring`), so partial replies survive client disconnects and upstream
  failures; new-chat titles run on a detached fiber (`Effect.forkDetach`) so the
  DB write survives a hang-up, with the `title` frame merged in best-effort.
- **Voice context bridge**: both voice modes seed the session with the chat's recent
  messages. The client only sends a `chatId`; the SERVER ownership-checks it and
  serializes the history (`serializeVoiceHistory`, 2400-char cap) — fabricated
  "history" can't be injected into the assistant instructions, and the LiveKit JWT
  stays small. LiveKit mode carries it in participant token attributes (same
  mechanism as the original Python agent); Realtime mode bakes it into the session
  instructions at secret-mint time.
- **Security posture**: the OpenAI API key never leaves the server. The Realtime
  ephemeral secret (`ek_…`, ~1min mint window, session-scoped config) and the LiveKit
  room token (15-min TTL, room-scoped, audio-only grant, no data publishing) are
  bearer credentials by design — a determined user can drive them outside the app,
  bounded by their expiry. Rate limiting (in-memory sliding window, `RateLimit`
  service): register 5/15min per IP, sign-in 10/5min per IP, voice mints 10/5min
  per user (shared budget across both modes), 429 + Retry-After. Single-process
  by design — swap for a shared store if this ever runs multi-instance.

## Running it

### server

```bash
cd server
pnpm install
cp .env.example .env   # AUTH_SECRET + OPENAI_API_KEY required; LIVEKIT_* only for voice
pnpm dev               # http://localhost:3000
pnpm test && pnpm typecheck
```

API: `POST /api/auth/register|token`, `POST /api/chat` (SSE), `GET /api/history`,
`GET|DELETE /api/chat/:id`, `POST /api/stt`, `POST /api/voice/livekit`,
`POST /api/voice/realtime`.

### agent (LiveKit voice mode)

```bash
cd agent
pnpm install
cp .env.example .env   # LIVEKIT_URL/KEY/SECRET + OPENAI_API_KEY
pnpm dev               # builds + registers the worker against your LiveKit project
```

### app

```bash
cd app
npm install --legacy-peer-deps   # @config-plugins/react-native-webrtc still declares expo@^56
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000 npx expo run:ios   # dev build (not Expo Go)
```

## SSE protocol (`POST /api/chat`)

```
data: {"type":"chat","chatId":"…"}    always first; client learns the id of a new chat
data: {"type":"delta","text":"…"}     streamed assistant text
data: {"type":"title","title":"…"}    new chats only, always before done
data: {"type":"done"}                 TERMINAL frame — reply + title both finished; safe to close
data: {"type":"error","message":"…"}  terminal frame on failure (no done)
```

## Deliberate scope cuts (vs the original)

Vercel-template features NOT ported (add later if wanted): artifacts/documents
(code/image/sheet editors), suggestions, message voting, Supermemory integration,
Vercel Blob file uploads, resumable streams (Redis), guest auth, model picker
(one model via `OPENAI_CHAT_MODEL`), web chat UI (the SolidStart app serves the API +
a landing page; the product surface is the Expo app).

Ported beyond the first cut: markdown rendering in assistant bubbles
(react-native-markdown-display, dark theme), mic mute in both voice modes,
per-route rate limiting.

## Verification status

- server: `vitest` 16/16 green; typecheck clean (TS strict + exactOptionalPropertyTypes
  + noUncheckedIndexedAccess); full curl QA — register → sign-in → streamed multi-turn
  chat with context recall → history/detail/delete → 401 paths; SQLite rows inspected;
  disconnect-mid-stream persists the partial reply (red→green); `/api/voice/realtime`
  minted real ephemeral secrets against the live GA API (response shape verified:
  flat `{value, expires_at, session}`); foreign chatId → 404. Two 4-model consensus
  reviews (chat stream lifecycle; voice chain) — all actionable findings fixed.
- agent: `tsc` clean; worker CLI boots. Live room QA requires LiveKit Cloud creds —
  not available in this workspace at build time.
- app: `tsc` clean (same strict flags); Metro bundles (`expo export`); `expo prebuild`
  validates the LiveKit/WebRTC config plugins (mic permission lands in Info.plist);
  `expo-doctor` 20/20. On-device QA requires a dev build on real hardware.
