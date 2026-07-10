import type { APIEvent } from "@solidjs/start/server"
import { Effect } from "effect"
import { randomUUID } from "node:crypto"
import { Auth } from "~/server/auth"
import { Db } from "~/server/db"
import { BadRequest, errorJson, json } from "~/server/http"
import { runtime } from "~/server/runtime"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

/**
 * Image upload for multimodal chat. Bytes live in SQLite (`media` table),
 * served back at the capability URL `/m/:id`. Multipart field: `file`.
 */
export async function POST(event: APIEvent): Promise<Response> {
  return runtime.runPromise(
    Effect.gen(function* () {
      const auth = yield* Auth
      const user = yield* auth.requireUser(event.request)

      const form = yield* Effect.tryPromise({
        try: () => event.request.formData(),
        catch: () => new BadRequest({ reason: "expected multipart form data" }),
      })
      const file = form.get("file")
      if (!(file instanceof File)) {
        return errorJson(400, "expected multipart form data with a `file` field")
      }
      const mime = file.type.split(";")[0]?.trim() ?? ""
      if (!ALLOWED_MIME.has(mime)) {
        return errorJson(415, `unsupported type ${mime} (jpeg/png/webp/gif only)`)
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return errorJson(413, "file too large (5MB max)")
      }

      const bytes = new Uint8Array(
        yield* Effect.tryPromise({
          try: () => file.arrayBuffer(),
          catch: () => new BadRequest({ reason: "unreadable upload" }),
        }),
      )

      const db = yield* Db
      const id = randomUUID()
      yield* db.insertMedia({ id, userId: user.userId, mime, data: bytes, createdAt: Date.now() })
      return json({ id, mime, url: `/m/${id}` }, 201)
    }).pipe(
      Effect.catchTag("Unauthorized", (e) => Effect.succeed(errorJson(401, e.reason))),
      Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))),
      Effect.catch((e) =>
        Effect.logError(`upload failed: ${String(e)}`).pipe(
          Effect.as(errorJson(500, "upload failed")),
        ),
      ),
    ),
  )
}
