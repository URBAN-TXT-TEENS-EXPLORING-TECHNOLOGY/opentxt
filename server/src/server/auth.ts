import { Context, Data, Effect, Layer, Redacted, Schema } from "effect"
import { jwtVerify, SignJWT } from "jose"
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { AuthConfig } from "./config"

export class AuthError extends Data.TaggedError("AuthError")<{
  readonly cause: unknown
}> {}

/** A request without a valid Bearer token. Routes map this to a 401. */
export class Unauthorized extends Data.TaggedError("Unauthorized")<{
  readonly reason: string
}> {}

/** The identity a verified token proves. */
export const AuthUser = Schema.Struct({
  userId: Schema.String,
  email: Schema.String,
})
export type AuthUser = typeof AuthUser.Type

const TOKEN_TTL = "7d"
const SCRYPT_KEYLEN = 64

/**
 * Auth service: scrypt password hashing + jose HS256 JWTs. This replaces the
 * original repo's THREE auth systems (NextAuth sessions for web, a parallel
 * hand-rolled JWT path for mobile, and User-Agent sniffing middleware to pick
 * between them) with ONE explicit Bearer-token scheme for every client.
 */
export class Auth extends Context.Service<Auth>()("opentxt/Auth", {
  make: Effect.gen(function* () {
    const cfg = yield* AuthConfig
    const key = new TextEncoder().encode(Redacted.value(cfg.secret))

    return {
      /** `salt:hex` scrypt digest. Synchronous by design (fast enough at login rates). */
      hashPassword: (password: string): Effect.Effect<string, AuthError> =>
        Effect.try({
          try: () => {
            const salt = randomBytes(16).toString("hex")
            const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex")
            return `${salt}:${hash}`
          },
          catch: (cause) => new AuthError({ cause }),
        }),

      /** Constant-time comparison against a stored `salt:hex` digest. */
      verifyPassword: (password: string, stored: string): Effect.Effect<boolean, AuthError> =>
        Effect.try({
          try: () => {
            const [salt, hash] = stored.split(":")
            if (salt === undefined || hash === undefined) return false
            const candidate = scryptSync(password, salt, SCRYPT_KEYLEN)
            const expected = Buffer.from(hash, "hex")
            return candidate.length === expected.length && timingSafeEqual(candidate, expected)
          },
          catch: (cause) => new AuthError({ cause }),
        }),

      /** Mint a 7-day HS256 JWT for a user. */
      signToken: (user: AuthUser): Effect.Effect<string, AuthError> =>
        Effect.tryPromise({
          try: () =>
            new SignJWT({ email: user.email })
              .setProtectedHeader({ alg: "HS256" })
              .setSubject(user.userId)
              .setIssuedAt()
              .setExpirationTime(TOKEN_TTL)
              .sign(key),
          catch: (cause) => new AuthError({ cause }),
        }),

      /**
       * Authenticate a request: extract the Bearer token, verify signature +
       * expiry, and decode the claims through `AuthUser` (parse, don't trust).
       */
      requireUser: (request: Request): Effect.Effect<AuthUser, Unauthorized> =>
        Effect.gen(function* () {
          const header = request.headers.get("Authorization") ?? ""
          if (!header.startsWith("Bearer ")) {
            return yield* new Unauthorized({ reason: "missing bearer token" })
          }
          const token = header.slice("Bearer ".length)
          const payload = yield* Effect.tryPromise({
            try: () => jwtVerify(token, key),
            catch: () => new Unauthorized({ reason: "invalid or expired token" }),
          })
          return yield* Schema.decodeUnknownEffect(AuthUser)({
            userId: payload.payload.sub,
            email: payload.payload.email,
          }).pipe(Effect.mapError(() => new Unauthorized({ reason: "malformed token claims" })))
        }),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
