# opentxt — agent operating guide

Three pnpm packages, no workspace: `server/` (SolidStart 2 + Effect v4 +
`node:sqlite`), `agent/` (LiveKit Agents worker), `app/` (Expo SDK 57 dev
build). Read the README's "Field notes" before touching voice or streaming
code — every entry there is a bug someone already paid for.

## Commands

```bash
pnpm dev:server / dev:app / dev:app:tunnel / agent   # from repo root, separate terminals
pnpm test        # server vitest (the only test suite)
pnpm typecheck   # all three packages
cd app && npx expo export --platform ios --output-dir /tmp/x   # Metro bundle gate
cd app && npx expo prebuild --platform ios --no-install && rm -rf ios  # config-plugin gate
```

Server envs: `AUTH_SECRET` + `OPENAI_API_KEY` required; `LIVEKIT_*` only for
voice. Agent additionally takes `GOOGLE_API_KEY`/`GEMINI_API_KEY`. Never
commit `.env`; examples are the contract.

## Non-negotiables

- **Effect v4 (beta), not v3.** APIs differ: `Effect.catch` (not `catchAll`),
  `Effect.forkChild`/`forkDetach` (not `fork`/`forkDaemon`),
  `Schema.encodeEffect`/`decodeUnknownEffect`/`decodeUnknownOption`,
  `Context.Service` classes + `Layer.effect`. When unsure, read the installed
  `effect` package's source, not v3 docs.
- **Every I/O boundary is a parse.** `server/src/server/db.ts` is the ONLY
  module that imports the SQLite driver; every DB write goes through
  `Schema.encodeEffect`, every read through `Schema.decodeUnknownEffect`.
  Same for request bodies, upstream SSE chunks, and client-side responses.
  No `as any`, no `@ts-ignore`, anywhere.
- **The chat stream's invariants** (route `api/chat.ts`): assistant persistence
  lives in a `Stream.ensuring` finalizer (must survive disconnect/failure/
  stop); titles run on a detached fiber; `chat` frame first, `done` strictly
  terminal. If you touch this code, re-run the disconnect test below.
- **Voice greetings use `generateReply()`, never `session.say()`** —
  speech-to-speech models (gpt-realtime-2.x, Gemini Live) have no TTS
  side-channel and `say()` crashes the job after it joins.
- **Verify on the real surface before claiming done.** Typecheck + tests are
  the floor: boot the thing and use it (curl the SSE, drive the browser, run
  the simulator). The repo's history holds multiple bugs that were green at
  every gate and only fell out of real usage.

## Verification playbook

```bash
# auth + streamed chat against a running server
TOKEN=$(curl -s -X POST localhost:3000/api/auth/guest | jq -r .token)
curl -sN -X POST localhost:3000/api/chat -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"message":"Reply with exactly: ok"}'

# THE disconnect test (stream lifecycle): kill mid-stream, partial must persist
curl -sN ... -d '{"message":"Count to 200 slowly"}' --max-time 2
sqlite3 server/data/opentxt.db "SELECT role, length(content) FROM messages ORDER BY created_at DESC LIMIT 2;"

# LiveKit voice end-to-end without audio hardware: join the room from a browser
# (load livekit-client from a CDN on the /chat page, connect with a minted token,
# assert an agent- participant joins, publishes an audio track, and its
# lk.agent.state reaches "listening"). Works headless; no mic needed.
```

Web `/chat` is the browser-QA surface — same API as the app. Kill dev
processes with `lsof -ti:PORT -sTCP:LISTEN` (without `-sTCP:LISTEN` you'll
also match — and kill — processes merely connected to that port).

## Computer-use: driving the iOS Simulator / a device

For UI verification beyond the web surface, drive the real app. The loop is
always **screenshot → look → act → screenshot → verify**; never chain blind
actions.

- **Screenshots** (no window focus needed, device pixels @3x):
  `xcrun simctl io <UDID> screenshot /tmp/step.png`
- **Install/launch**: `xcrun simctl install <UDID> <path>.app` and
  `xcrun simctl launch <UDID> chat.opentxt.app`. Built products live under
  `~/Library/Developer/Xcode/DerivedData/opentxt-*/Build/Products/`.
- **Clicking**: use `cliclick c:X,Y` (real CGEvents). AppleScript's
  `System Events click at` silently fails to reach the Simulator — it *looks*
  like it clicked and nothing happens.
- **Coordinates**: get the window frame with
  `osascript -e 'tell application "System Events" to tell process "Simulator" to get {position, size} of window 1'`,
  map screenshot pixels through the window scale, and re-measure whenever a
  click stops landing (windows move).
- **Typing**: prefer
  `osascript -e 'tell application "System Events" to keystroke "text"'` —
  it's unicode-based. `cliclick t:` sends raw keycodes and produces garbage on
  non-QWERTY host layouts (Dvorak/Colemak); if you must use it, verify the
  first field's contents in a screenshot before continuing.
- **Etiquette on shared machines**: `xcrun simctl list devices | grep Booted`
  first. Other agents/humans may own a booted simulator — boot your own
  device, and only ever target your own UDID (screenshot/install/launch;
  never shutdown/erase someone else's).
- **Physical devices**: when an Xcode install fails with an opaque error, run
  `xcrun devicectl device install app --device <id> <path>.app` — it prints
  the underlying reason (e.g. `MismatchedApplicationIdentifierEntitlement`
  from a same-id app signed by another team; delete the old install).
  `xcrun devicectl device info details` shows UDID, OS, developer-mode state.
- **Know the limits**: this loop is slow (~10–20s per action for a vision
  agent) and right for exploratory QA. Repeatable suites belong in
  Maestro/XCUITest; anything with a DOM belongs in a browser tool.

## Repo conventions

- Commits are atomic with story-telling messages; include what was VERIFIED.
- `app/ios` + `app/android` are generated (CNG) — never commit them; config
  changes go through `app.json` + `expo prebuild`.
- The identifiers `chat.opentxt.app` are the official ones — forks change
  them (see README "Forking?").
- README Field notes is the scar-tissue ledger: when you pay for a new
  lesson, append it there.
