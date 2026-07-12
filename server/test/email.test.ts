import { Option, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { Email } from "~/server/http"

const decode = Schema.decodeUnknownOption(Email)
const ok = (s: string) => Option.isSome(decode(s))

describe("Email", () => {
  it("accepts normal addresses", () => {
    expect(ok("qa@opentxt.dev")).toBe(true)
    expect(ok("first.last+tag@sub.example.co")).toBe(true)
  })

  it("rejects the sim-QA garbage that used to register (domain with ';')", () => {
    expect(ok("dlmqa1@;rkifxf.gkv")).toBe(false)
  })

  it("rejects shapes without @, TLD, or with spaces", () => {
    expect(ok("not-an-email")).toBe(false)
    expect(ok("a@b")).toBe(false)
    expect(ok("a b@c.com")).toBe(false)
    expect(ok("@x.com")).toBe(false)
    expect(ok("a@.com")).toBe(false)
  })
})
