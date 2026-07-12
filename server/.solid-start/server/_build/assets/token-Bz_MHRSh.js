import { Effect, Schema } from "effect";
import { r as runtime, R as RateLimit, c as clientAddress, A as Auth, D as Db } from "./runtime-Dcl443l5.js";
import { d as decodeBody, e as errorJson, j as json, t as tooManyRequests } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const TokenRequest = Schema.Struct({
  email: Schema.String,
  password: Schema.String
});
async function POST(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const rl = yield* RateLimit;
    yield* rl.hit(`token:${clientAddress(event.request)}`, 10, 5 * 6e4);
    const input = yield* decodeBody(event.request, TokenRequest);
    const auth = yield* Auth;
    const db = yield* Db;
    const user = yield* db.getUserByEmail(input.email);
    if (user === null) return errorJson(401, "invalid credentials");
    const ok = yield* auth.verifyPassword(input.password, user.passwordHash);
    if (!ok) return errorJson(401, "invalid credentials");
    const token = yield* auth.signToken({
      userId: user.id,
      email: user.email
    });
    return json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  }).pipe(Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))), Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))), Effect.catch((e) => Effect.logError(`token failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  POST
};
//# sourceMappingURL=token-Bz_MHRSh.js.map
