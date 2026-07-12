import { Effect, Schema } from "effect";
import { randomUUID } from "node:crypto";
import { r as runtime, R as RateLimit, c as clientAddress, A as Auth, D as Db } from "./runtime-Dcl443l5.js";
import { d as decodeBody, e as errorJson, j as json, t as tooManyRequests, E as Email } from "./http-DuyBzkS0.js";
import "dotenv/config";
import "jose";
import "node:fs";
import "node:path";
import "node:sqlite";
import "livekit-server-sdk";
const RegisterRequest = Schema.Struct({
  email: Email,
  password: Schema.String.check(Schema.isMinLength(8))
});
async function POST(event) {
  return runtime.runPromise(Effect.gen(function* () {
    const rl = yield* RateLimit;
    yield* rl.hit(`register:${clientAddress(event.request)}`, 5, 15 * 6e4);
    const input = yield* decodeBody(event.request, RegisterRequest);
    const auth = yield* Auth;
    const db = yield* Db;
    const existing = yield* db.getUserByEmail(input.email);
    if (existing !== null) return errorJson(409, "email already registered");
    const user = {
      id: randomUUID(),
      email: input.email,
      passwordHash: yield* auth.hashPassword(input.password),
      createdAt: Date.now()
    };
    yield* db.createUser(user);
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
    }, 201);
  }).pipe(Effect.catchTag("RateLimited", (e) => Effect.succeed(tooManyRequests(e.retryAfterMs))), Effect.catchTag("BadRequest", (e) => Effect.succeed(errorJson(400, e.reason))), Effect.catch((e) => Effect.logError(`register failed: ${String(e)}`).pipe(Effect.as(errorJson(500, "internal error"))))));
}
export {
  POST
};
//# sourceMappingURL=register-DCMEBi34.js.map
