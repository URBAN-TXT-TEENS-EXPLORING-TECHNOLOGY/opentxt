# opentxt

Talk to an AI with your thumbs or your voice. **opentxt** is a small, complete,
aggressively type-safe AI chat app — native mobile client, reactive web client,
streaming server, and a voice agent that speaks through OpenAI *or* Gemini —
built as a working answer to the question: *what does a modern voice-AI stack
look like when every layer is typed, every boundary is validated, and every
claim is verified against the real thing?*

```
opentxt/
├── server/   SolidStart 2 + Effect v4 — API, SQLite, SSE streaming, web client (:3000)
├── agent/    LiveKit Agents worker — speech-to-speech via gpt-realtime-2.1 or Gemini Live
└── app/      Expo SDK 57 — chat, attachments, and BOTH voice modes (dev build)
```

The stack is deliberately bleeding-edge: Effect 4 (beta), SolidStart 2 (alpha),
Expo 57, `node:sqlite`, the GA OpenAI Realtime API, and LiveKit Agents JS.
Every version pin is a choice, and most of them taught us something — see
[Field notes](#field-notes) for the scars.

## Architecture

```
┌──────────────┐   Bearer JWT    ┌───────────────────────────────┐
│  Expo app    │ ──────────────► │  server (SolidStart + Effect)  │
│  + web /chat │   SSE /api/chat │  Db · Auth · Ai · LiveKitVoice │
│              │                 │  · OpenAiRealtime · RateLimit  │
│  voice modes:│                 └──────┬──────────────┬─────────┘
│              │                        │              │
│  1) LiveKit ─┼── WebRTC ─► LiveKit ◄──┼─ dispatches ─┤ mints room token
│              │            room        │              │ (history in attrs)
│              │              ▲   ┌─────▼─────┐        │
│              │              └───┤ agent/    │        │
│              │                  │ realtime model     │
│              │                  │ (openai | google)  │
│  2) Realtime─┼── WebRTC ─────────────────► OpenAI    │ mints ephemeral
│              │   /v1/realtime/calls        Realtime ◄┘ client secret
└──────────────┘                             (GA)
```

Text chat is one POST per turn, streamed back as server-sent events. Voice has
**two independent topologies**, kept on purpose:

- **Direct** — the phone opens WebRTC straight to OpenAI with a server-minted
  ephemeral secret. Lowest latency, zero infrastructure. 1:1 only, OpenAI only.
- **LiveKit** — the phone joins a room; the server dispatches the agent worker,
  which runs the realtime model of your choosing (`provider: "openai" | "google"`).
  This is the multi-provider, multi-party lane. The client cannot tell which
  model answered — that's the point.

The tradeoff analysis (pricing models, session limits, the SFU question, why
Gemini never gets a direct client path) lives in [docs/VOICE.md](docs/VOICE.md).

## Quickstart

```bash
# server — the only required env is AUTH_SECRET + OPENAI_API_KEY
cd server && pnpm install
cp .env.example .env
pnpm dev                      # http://localhost:3000 — API + web client at /chat

# app (new terminal) — dev build, not Expo Go (native modules)
cd app && pnpm install
npx expo run:ios              # or: run:ios --device / run:android

# voice agent (only for the LiveKit voice mode; needs LIVEKIT_* creds)
cd agent && pnpm install && cp .env.example .env
pnpm dev
```

Or from the repo root: `pnpm dev:server`, `pnpm dev:app`, `pnpm agent`.

No API URL configuration in development — the app derives its base URL from
wherever the JS bundle came from, and Metro reverse-proxies `/api` and `/m`
to the server (`app/metro.config.js`). **If the device can load the bundle,
it can reach the API.** On networks where the phone can't see your machine
(hotspots, corporate Wi-Fi, host firewalls): `pnpm dev:app:tunnel` — the API
rides the tunnel too. Production builds set `EXPO_PUBLIC_API_URL`.

## The interesting parts

**Every I/O boundary is a parse, not a cast.** `server/src/server/db.ts` is
the only module allowed to import the SQLite driver; every write goes through
`Schema.encodeEffect`, every read through `Schema.decodeUnknownEffect`. The
same rule at the OpenAI SSE boundary, the request bodies, the client's view of
the server, even the agent's participant attributes. A wrong shape is rejected
where it enters, never trusted into the app. (`as any` count: zero.)

**The chat stream is a lifecycle, not a happy path.** The assistant reply is
persisted by a *stream finalizer* (`Stream.ensuring`), so text the user
already saw survives client disconnects, upstream failures, and the stop
button — all three exercised deliberately. New-chat titles generate on a
*detached fiber*: the DB write lands even if the user hangs up mid-stream,
and the `title` event is best-effort. `done` is emitted only after both
branches finish, so clients may treat it as terminal. The stop button is the
same machinery proven on purpose: abort mid-stream, reload, the partial is
there.

**Voice providers are a server-side switch.** `POST /api/voice/livekit
{"provider":"google"}` and nothing else changes — the worker picks
`gpt-realtime-2.1` or Gemini Live from a participant attribute. Chat history
rides the same attributes (serialized *server-side* from the DB after an
ownership check, capped — clients can't inject fabricated context into the
model's instructions, and the JWT stays small).

**Media are capability URLs.** Uploads land in SQLite; `/m/:id` serves them
with an unguessable UUID as the whole access model, so plain `<img>`/`<Image>`
tags work without auth headers. Model input inlines the bytes as base64 data
URLs — a dev server on localhost isn't reachable by OpenAI's fetchers, and
this works identically deployed or not.

**The web client is the same API, reactively.** `/chat` is Solid signals over
the identical Bearer + SSE + upload endpoints the app uses — a second consumer
that keeps the API honest, and the surface where most browser-driven QA runs.

**Abuse costs are bounded.** Sliding-window rate limits per route (register
5/15min/IP, sign-in 10/5min/IP, voice mints 10/5min/user across both modes)
with `Retry-After`; ephemeral voice credentials expire in minutes; the OpenAI
API key never leaves the server.

## API

`POST /api/auth/register` · `POST /api/auth/token` · `POST /api/auth/guest` —
Bearer JWT (jose HS256, scrypt passwords), one explicit scheme for every client.

`POST /api/chat` — one user turn in, SSE out. Optional `attachments`
(media ids), `model` (validated against `GET /api/models`).

```
data: {"type":"chat","chatId":"…"}    always first; a new chat's id
data: {"type":"delta","text":"…"}     streamed assistant text
data: {"type":"title","title":"…"}    new chats, always before done
data: {"type":"done"}                 terminal — reply + title both finished
data: {"type":"error","message":"…"}  terminal on failure
```

`GET /api/history` · `GET|DELETE /api/chat/:id` · `POST /api/files/upload` ·
`GET /m/:id` · `POST /api/stt` (Whisper) · `POST /api/voice/livekit` ·
`POST /api/voice/realtime`.

## Developing on a real phone

`npx expo run:ios --device` once (the dev client includes a launcher), then
`pnpm dev:app` on friendly networks or `pnpm dev:app:tunnel` anywhere. Tunnel
origins are automatically upgraded to https (iOS ATS refuses cleartext to
internet hosts). For a daily-driver install with instant cold starts, build
Release — the JS is embedded, and `NSAllowsLocalNetworking` lets it reach a
LAN server:

```bash
EXPO_PUBLIC_API_URL=http://<your-machine>:3000 npx expo run:ios --configuration Release --device
```

## Field notes

Lessons paid for in debugging time, kept here so you don't pay twice:

- **Speech-to-speech models have no TTS side-channel.** `session.say("hi")`
  throws on both Gemini Live and `gpt-realtime-2.x` — greet with
  `generateReply()` and let the model speak for itself. (The older
  `gpt-realtime` tolerated `say()`, which made this a silent regression on
  model bump: the agent joined, crashed, and the client sat in "connecting".)
- **The GA Realtime API is a hard break from the beta.** Mint client secrets
  at `/v1/realtime/client_secrets` (flat `{value, expires_at, session}` —
  verified against the live API, whatever older docs imply), exchange SDP at
  `/v1/realtime/calls`, use GA event names. `reasoning.effort: "low"` is
  accepted for realtime-2-class models and worth setting.
- **Gemini bills accumulated audio context every turn** — turn count drives
  cost more than duration. Cap injected history; see docs/VOICE.md.
- **Metro can be a reverse proxy.** `enhanceMiddleware` + ~30 lines of
  `http.request` turns "two servers to reach" into one origin — but put an
  error handler on *every* stream in the chain (one unhandled `'error'` event
  kills the Metro process), and use `agent: false` (pooled keep-alive sockets
  die on server restarts).
- **Vision models confabulate on tiny synthetic images.** A 64×64 flat-red
  PNG came back "blue" — from the API directly, pipeline exonerated. Verify
  multimodal pipelines with *structured* images (gradients, stripes) that
  can't be guessed.
- **Device installs are stricter than simulators.** A bare Xcode error 3002
  turned out to be `MismatchedApplicationIdentifierEntitlement` — an old
  install from a different signing team. `xcrun devicectl device install`
  prints the real reason Xcode hides.
- **`lsof -ti:PORT` matches client sockets too.** Kill scripts want
  `-sTCP:LISTEN`, or you'll murder the process that was merely *talking* to
  the port. (Ask us how we know.)

## Non-goals (so far)

Editors-in-chat (artifacts/documents/suggestions), message voting, resumable
mid-flight streams (the finalizer already guarantees no data loss on
disconnect — resuming a *live* stream is machinery waiting for demand), and
third-party memory services. The scope is a complete, verifiable core — not a
feature checklist.

## Verification culture

Nothing in this README is aspirational: the stream lifecycle was proven
red→green with mid-stream disconnects against a live server; both voice
providers were verified end-to-end against real LiveKit rooms (agent joins,
speaks, returns to listening); the GA endpoints were exercised with real
credentials; the web client is driven by a real browser in QA; and the server
suite (`pnpm test`, 25 specs) locks the boundaries — password hashing, schema
rejection at the DB layer, rate-limit windows, SSE chunk parsing. If you
change the streaming code, run the disconnect test before you trust it.
