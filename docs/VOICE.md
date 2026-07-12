# Voice architecture: LiveKit vs OpenAI Realtime vs Gemini Live

Decision doc for opentxt's long-term voice support. Research snapshot: July 2026
(sources: provider docs, LiveKit agents-js source/issues, production write-ups).

## TL;DR recommendation

Keep exactly the two topologies we already ship, and add Gemini **through
LiveKit**, not as a third client path:

1. **Direct OpenAI Realtime over WebRTC** (`/api/voice/realtime`) — the 1:1
   fast path. Lowest latency (no SFU hop), no infra cost, dead-simple. Keep it.
2. **LiveKit room + Node agent** (`/api/voice/livekit` + `opentxt/agent`) —
   the *multi-provider abstraction*. `voice.AgentSession` runs OpenAI Realtime
   today via `@livekit/agents-plugin-openai`; **Gemini Live drops in via
   `@livekit/agents-plugin-google` with zero client changes** — the Expo app
   just joins a room either way.

Do NOT build a direct-from-client Gemini path: it's WebSocket-only (no WebRTC),
has no first-party mobile SDK, and every working Expo example needs a custom
native PCM-streaming module. The LiveKit hop erases that entire problem class.

## The three options

### OpenAI Realtime (GA) — what we run today

- **Models**: `gpt-realtime` (Aug 2025 GA, our default) → `gpt-realtime-1.5` →
  `gpt-realtime-2` / `2.1` (GPT-5-class reasoning, 128k context, parallel tool
  calls) → `gpt-realtime-mini` (cheap tier), `-translate`, `-whisper`. Beta API
  shut down 2026-05-12.
- **Pricing**: audio $32/1M in, $64/1M out (≈ cached input $0.40); text $4/1M in.
- **Limits**: 60-min session hard cap; 32k context (128k on `-2`/`-2.1`).
- **Topology**: client-direct WebRTC with ephemeral `client_secrets` (what we
  do), or WebSocket server-side. Explicitly **1:1 by design** — OpenAI's infra
  blog: transceiver model, not an SFU. Never expect multi-party from it.
- **Telephony**: first-class SIP (`sip.api.openai.com`) + webhook call control —
  a real gap over Gemini if we ever want phone calls.
- **Gotchas**: interruption handling is a 3-step client dance (stop playback,
  clear buffer, report what was actually heard); audio modality not
  HIPAA-eligible as of May 2026.

### Gemini Live API

- **Models**: churning fast, all still "preview" — `gemini-3.1-flash-live-preview`
  is current (128k ctx, `thinkingLevel`); 2.0/2.5 generations already
  deprecated/shutdown within ~a year.
- **Pricing**: audio in $3/1M (~$0.005/min), audio out $12/1M (~$0.018/min) —
  *nominally* ~3-5x cheaper than OpenAI, **BUT** billing accumulates the whole
  audio context every turn (confirmed by Google eng on the forum: turn count,
  not duration, drives cost — a 5.8-min call was measured cheaper than a
  5.6-min one). Long chatty sessions can invert the price advantage. Also:
  transcription bills separately on top.
- **Limits**: much tighter — ~10-min connection lifetime (resume via handle),
  15-min audio session (2 min with video) unless context compression is on.
- **Topology**: WebSocket only, no WebRTC. Ephemeral tokens exist and are
  client-direct-capable, but on React Native there's no first-party SDK and
  stock Expo audio can't stream 40ms PCM chunks — community examples all need
  a custom native module. **This is why we don't build a third client path.**
- **No first-party telephony** (bridge via LiveKit/Twilio if ever needed).

### LiveKit (the infra layer, not a model)

- **Adds**: SFU multi-party rooms (the only path to >2 humans + agent), agent
  dispatch/lifecycle, Krisp noise cancellation before VAD, telephony, RN SDK
  that is *actually maintained* (`@livekit/react-native` 2.11.x), observability.
- **Agents JS plugins today**: `@livekit/agents-plugin-openai` (1.5.0, OpenAI
  Realtime GA) and **`@livekit/agents-plugin-google` (1.2.5, Gemini Live)** —
  both expose the same `RealtimeModel` shape under `voice.AgentSession`. One
  abstraction, both providers, server-side. Also: Nova Sonic, Grok Voice, etc.
- **Known gap** (open as of Apr 2026, livekit/agents-js#1197): the Google
  plugin's `generateReply()` breaks on `gemini-3.1-flash-live-preview` —
  pin `gemini-2.5-flash-native-audio-preview-12-2025` for AgentSession flows
  until resolved. Our agent uses `session.say()` for the greeting, which rides
  the same continuation machinery — verify on integration.
- **Cost**: $0.01/min agent session + $0.0004–0.0005/min WebRTC (Cloud tiers:
  free 1k agent-min; $50/mo → 5k; $500/mo → 50k) **on top of** provider model
  cost. Fully-loaded voice-agent estimates run ~$0.08–0.22/min.

## Decision matrix

| Need | Winner | Why |
| --- | --- | --- |
| 1:1 voice, lowest latency + cost | Direct OpenAI WebRTC | no SFU hop, no per-min infra fee |
| Provider flexibility (OpenAI ↔ Gemini) | LiveKit agent | plugin swap server-side; client untouched |
| Multi-party / multi-device rooms | LiveKit | OpenAI is 1:1 by design; Gemini has nothing |
| Phone calls | OpenAI SIP (direct) or LiveKit telephony | Gemini: none |
| Cheapest per-minute (short, few-turn calls) | Gemini via LiveKit | $3/$12 per 1M vs $32/$64 — but see per-turn context billing |
| Long sessions (>15 min) | OpenAI (60 min cap) | Gemini needs reconnect + compression choreography |

## Concrete plan for Gemini support (when we want it)

1. `pnpm add @livekit/agents-plugin-google` in `opentxt/agent`.
2. Agent: select the model from an env/attribute switch —
   `new google.beta.realtime.RealtimeModel({ model: "gemini-2.5-flash-native-audio-preview-12-2025" })`
   (pin until agents-js#1197 closes; then move to 3.1-flash-live).
3. Server: extend `/api/voice/livekit` with an optional validated
   `provider: "openai" | "google"` field → pass through participant attributes
   (same mechanism as `historyMessages`); the agent reads it and picks the model.
4. App: nothing changes. The voice screen already just joins a room.
5. Cost guard: because of Gemini's per-turn context billing, cap voice-session
   history injection (already capped at 2400 chars) and keep the 15-min token
   TTL as the session budget.

## What we deliberately do NOT do

- No direct-from-client Gemini WebSocket path (native audio module tax, no SDK,
  10-min reconnect choreography — all erased by the LiveKit hop).
- No LiveKit-only consolidation either: the direct OpenAI WebRTC path stays,
  because for the dominant 1:1 case it's faster and has zero infra cost. The
  two paths share the server-side history/instructions builder, so behavior
  stays identical.
