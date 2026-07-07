import { Context, Data, Effect, Layer, Schema } from "effect"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { DatabaseConfig } from "./config"

export class DbError extends Data.TaggedError("DbError")<{
  readonly cause: unknown
}> {}

/** Author of a chat message. The voice agent writes as `assistant` too. */
export const Role = Schema.Literals(["user", "assistant"])
export type Role = typeof Role.Type

/**
 * A registered account. `passwordHash` is `scrypt(salt, password)` in
 * `salt:hex` form — never a plaintext password.
 */
export const UserRow = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  passwordHash: Schema.String,
  createdAt: Schema.Number,
})
export type UserRow = typeof UserRow.Type

/** A conversation. `title` is model-generated after the first user turn. */
export const ChatRow = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  title: Schema.String,
  createdAt: Schema.Number,
})
export type ChatRow = typeof ChatRow.Type

/**
 * A persisted chat message. This is the parse boundary for the `messages`
 * table: every write is encoded through this schema and every read decoded
 * through it (the workspace type-safety rule — a wrong shape is rejected at
 * the I/O boundary, not trusted into the app).
 */
export const MessageRow = Schema.Struct({
  id: Schema.String,
  chatId: Schema.String,
  role: Role,
  content: Schema.String,
  createdAt: Schema.Number,
})
export type MessageRow = typeof MessageRow.Type

const decodeRow = <S extends Schema.Top>(schema: S, row: unknown) =>
  Schema.decodeUnknownEffect(schema)(row).pipe(
    Effect.mapError((cause) => new DbError({ cause })),
  )

/**
 * The ONLY module that may import the SQLite driver. Its API speaks the
 * domain types (`UserRow`/`ChatRow`/`MessageRow`), so a wrong shape can't
 * reach the database from a call site. `node:sqlite` is synchronous, so every
 * call is wrapped in `Effect.try` (no promise hop). Tables are created
 * idempotently at layer construction.
 */
export class Db extends Context.Service<Db>()("opentxt/Db", {
  make: Effect.gen(function* () {
    const cfg = yield* DatabaseConfig

    const sqlite = yield* Effect.try({
      try: () => {
        mkdirSync(dirname(cfg.path), { recursive: true })
        const db = new DatabaseSync(cfg.path)
        db.exec("PRAGMA journal_mode = WAL")
        db.exec("PRAGMA foreign_keys = ON")
        db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id            TEXT    PRIMARY KEY,
            email         TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            created_at    INTEGER NOT NULL
          )
        `)
        db.exec(`
          CREATE TABLE IF NOT EXISTS chats (
            id         TEXT    PRIMARY KEY,
            user_id    TEXT    NOT NULL REFERENCES users(id),
            title      TEXT    NOT NULL,
            created_at INTEGER NOT NULL
          )
        `)
        db.exec("CREATE INDEX IF NOT EXISTS chats_user_created_idx ON chats (user_id, created_at)")
        db.exec(`
          CREATE TABLE IF NOT EXISTS messages (
            id         TEXT    PRIMARY KEY,
            chat_id    TEXT    NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
            role       TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
            content    TEXT    NOT NULL,
            created_at INTEGER NOT NULL
          )
        `)
        db.exec("CREATE INDEX IF NOT EXISTS messages_chat_created_idx ON messages (chat_id, created_at)")
        return db
      },
      catch: (cause) => new DbError({ cause }),
    })

    const attempt = <A>(f: () => A): Effect.Effect<A, DbError> =>
      Effect.try({ try: f, catch: (cause) => new DbError({ cause }) })

    return {
      /** Insert a user. Fails with DbError (UNIQUE constraint) on a taken email. */
      createUser: (user: UserRow): Effect.Effect<void, DbError> =>
        Effect.gen(function* () {
          const row = yield* Schema.encodeEffect(UserRow)(user).pipe(
            Effect.mapError((cause) => new DbError({ cause })),
          )
          yield* attempt(() =>
            sqlite
              .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
              .run(row.id, row.email, row.passwordHash, row.createdAt),
          )
        }),

      getUserByEmail: (email: string): Effect.Effect<UserRow | null, DbError> =>
        Effect.gen(function* () {
          const row = yield* attempt(() =>
            sqlite
              .prepare(
                `SELECT id, email, password_hash AS passwordHash, created_at AS createdAt
                 FROM users WHERE email = ? LIMIT 1`,
              )
              .get(email),
          )
          if (row === undefined) return null
          return yield* decodeRow(UserRow, row)
        }),

      /** Insert a chat shell (title placeholder until the model names it). */
      createChat: (chat: ChatRow): Effect.Effect<void, DbError> =>
        Effect.gen(function* () {
          const row = yield* Schema.encodeEffect(ChatRow)(chat).pipe(
            Effect.mapError((cause) => new DbError({ cause })),
          )
          yield* attempt(() =>
            sqlite
              .prepare("INSERT INTO chats (id, user_id, title, created_at) VALUES (?, ?, ?, ?)")
              .run(row.id, row.userId, row.title, row.createdAt),
          )
        }),

      getChat: (id: string): Effect.Effect<ChatRow | null, DbError> =>
        Effect.gen(function* () {
          const row = yield* attempt(() =>
            sqlite
              .prepare(
                `SELECT id, user_id AS userId, title, created_at AS createdAt
                 FROM chats WHERE id = ? LIMIT 1`,
              )
              .get(id),
          )
          if (row === undefined) return null
          return yield* decodeRow(ChatRow, row)
        }),

      /** The user's chats, newest first (the history drawer). */
      listChats: (userId: string): Effect.Effect<ReadonlyArray<ChatRow>, DbError> =>
        Effect.gen(function* () {
          const rows = yield* attempt(() =>
            sqlite
              .prepare(
                `SELECT id, user_id AS userId, title, created_at AS createdAt
                 FROM chats WHERE user_id = ? ORDER BY created_at DESC`,
              )
              .all(userId),
          )
          return yield* decodeRow(Schema.Array(ChatRow), rows)
        }),

      setChatTitle: (id: string, title: string): Effect.Effect<void, DbError> =>
        attempt(() => {
          sqlite.prepare("UPDATE chats SET title = ? WHERE id = ?").run(title, id)
        }),

      /** Delete a chat; messages cascade. */
      deleteChat: (id: string): Effect.Effect<void, DbError> =>
        attempt(() => {
          sqlite.prepare("DELETE FROM chats WHERE id = ?").run(id)
        }),

      /** Persist one message. The write is validated/encoded through `MessageRow`. */
      insertMessage: (message: MessageRow): Effect.Effect<void, DbError> =>
        Effect.gen(function* () {
          const row = yield* Schema.encodeEffect(MessageRow)(message).pipe(
            Effect.mapError((cause) => new DbError({ cause })),
          )
          yield* attempt(() =>
            sqlite
              .prepare(
                "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
              )
              .run(row.id, row.chatId, row.role, row.content, row.createdAt),
          )
        }),

      /** All messages of a chat, oldest first (ready to feed the model). */
      listMessages: (chatId: string): Effect.Effect<ReadonlyArray<MessageRow>, DbError> =>
        Effect.gen(function* () {
          const rows = yield* attempt(() =>
            sqlite
              .prepare(
                `SELECT id, chat_id AS chatId, role, content, created_at AS createdAt
                 FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC`,
              )
              .all(chatId),
          )
          return yield* decodeRow(Schema.Array(MessageRow), rows)
        }),
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
