import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { Db } from "~/server/db"
import { runtime } from "~/server/runtime"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Serve uploaded media bytes. Capability URL: the unguessable UUID IS the
 * access control (mochi's /m/:id pattern) — needed so plain <img>/<Image>
 * tags can render attachments without auth headers.
 */
export async function GET(event: APIEvent): Promise<Response> {
  const id = event.params.id ?? ""
  if (!UUID_RE.test(id)) {
    return new Response("not found", { status: 404 })
  }
  return runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* Db
      const media = yield* db.getMedia(id)
      if (media === null) return new Response("not found", { status: 404 })
      return new Response(new Uint8Array(media.data), {
        headers: {
          "Content-Type": media.mime,
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      })
    }).pipe(
      Effect.catch(() => Effect.succeed(new Response("error", { status: 500 }))),
    ),
  )
}
