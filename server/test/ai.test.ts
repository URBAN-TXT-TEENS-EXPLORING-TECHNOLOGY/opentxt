import { describe, expect, it } from "vitest"
import { parseDeltaLine } from "~/server/ai"

describe("parseDeltaLine", () => {
  it("extracts a text delta from an OpenAI streaming chunk", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "hel" } }] })}`
    expect(parseDeltaLine(line)).toBe("hel")
  })

  it("ignores the [DONE] sentinel", () => {
    expect(parseDeltaLine("data: [DONE]")).toBeNull()
  })

  it("ignores non-data lines and blank lines", () => {
    expect(parseDeltaLine("")).toBeNull()
    expect(parseDeltaLine(": keepalive")).toBeNull()
    expect(parseDeltaLine("event: ping")).toBeNull()
  })

  it("drops malformed JSON instead of throwing", () => {
    expect(parseDeltaLine("data: {not json")).toBeNull()
  })

  it("drops chunks without content (role-only first chunk, finish chunk)", () => {
    expect(parseDeltaLine(`data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" } }] })}`)).toBeNull()
    expect(parseDeltaLine(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}`)).toBeNull()
    expect(parseDeltaLine(`data: ${JSON.stringify({ choices: [{ delta: { content: null } }] })}`)).toBeNull()
  })

  it("rejects a wrong shape at the boundary (choices not an array)", () => {
    expect(parseDeltaLine(`data: ${JSON.stringify({ choices: "nope" })}`)).toBeNull()
  })
})
