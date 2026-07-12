import { Effect } from "effect";
import { r as runtime, D as Db } from "./runtime-Dcl443l5.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function GET(event) {
  const id = event.params.id ?? "";
  if (!UUID_RE.test(id)) {
    return new Response("not found", {
      status: 404
    });
  }
  return runtime.runPromise(Effect.gen(function* () {
    const db = yield* Db;
    const media = yield* db.getMedia(id);
    if (media === null) return new Response("not found", {
      status: 404
    });
    return new Response(new Uint8Array(media.data), {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  }).pipe(Effect.catch(() => Effect.succeed(new Response("error", {
    status: 500
  })))));
}
export {
  GET
};
//# sourceMappingURL=_id_-Bysdw5Zx.js.map
