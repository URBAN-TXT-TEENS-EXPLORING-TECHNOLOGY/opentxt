import { Effect, ManagedRuntime } from "effect"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

process.env["DATABASE_PATH"] = join(mkdtempSync(join(tmpdir(), "opentxt-test-")), "test.db")

import { Db } from "~/server/db"

const runtime = ManagedRuntime.make(Db.layer)

const withDb = <A>(f: (db: Db["Service"]) => Effect.Effect<A, unknown>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const svc = yield* Db
      return yield* f(svc)
    }),
  )

const user = { id: "u-1", email: "qa@test.dev", passwordHash: "s:h", createdAt: 1000 }

describe("Db", () => {
  it("creates and finds a user; unknown email is null", async () => {
    await withDb((db) => db.createUser(user))
    await expect(withDb((db) => db.getUserByEmail("qa@test.dev"))).resolves.toEqual(user)
    await expect(withDb((db) => db.getUserByEmail("nobody@test.dev"))).resolves.toBeNull()
  })

  it("rejects a duplicate email (UNIQUE constraint -> DbError)", async () => {
    await expect(withDb((db) => db.createUser({ ...user, id: "u-2" }))).rejects.toThrow()
  })

  it("stores messages and returns them oldest-first", async () => {
    const chat = { id: "c-1", userId: "u-1", title: "New chat", createdAt: 2000 }
    await withDb((db) => db.createChat(chat))
    await withDb((db) =>
      db.insertMessage({ id: "m-2", chatId: "c-1", role: "assistant", content: "hi", createdAt: 3001 }),
    )
    await withDb((db) =>
      db.insertMessage({ id: "m-1", chatId: "c-1", role: "user", content: "hello", createdAt: 3000 }),
    )
    const messages = await withDb((db) => db.listMessages("c-1"))
    expect(messages.map((m) => m.id)).toEqual(["m-1", "m-2"])
  })

  it("rejects a role the schema does not allow (encode boundary)", async () => {
    await expect(
      withDb((db) =>
        db.insertMessage({
          id: "m-3",
          chatId: "c-1",
          // @ts-expect-error -- intentionally wrong: the boundary must reject it at runtime too
          role: "system",
          content: "x",
          createdAt: 3002,
        }),
      ),
    ).rejects.toThrow()
  })

  it("lists chats newest-first and updates titles", async () => {
    await withDb((db) => db.createChat({ id: "c-2", userId: "u-1", title: "Second", createdAt: 9000 }))
    await withDb((db) => db.setChatTitle("c-1", "Renamed"))
    const chats = await withDb((db) => db.listChats("u-1"))
    expect(chats.map((c) => c.id)).toEqual(["c-2", "c-1"])
    expect(chats[1]?.title).toBe("Renamed")
  })

  it("deleteChat cascades to messages", async () => {
    await withDb((db) => db.deleteChat("c-1"))
    await expect(withDb((db) => db.getChat("c-1"))).resolves.toBeNull()
    await expect(withDb((db) => db.listMessages("c-1"))).resolves.toEqual([])
  })
})
