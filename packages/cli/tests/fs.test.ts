import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ensureDir, upsertJson, writeFileSafe } from "../src/lib/fs"

let tmpDir = ""

function setupTemp() {
  if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "keyloom-fs-"))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
  tmpDir = ""
})

describe("fs helpers", () => {
  it("ensureDir creates nested directories", () => {
    const dir = path.join(setupTemp(), "nested", "dir")
    ensureDir(dir)
    expect(fs.existsSync(dir)).toBe(true)
  })

  it("writeFileSafe writes, overwrites by default, and respects skip option", () => {
    const file = path.join(setupTemp(), "file.txt")
    const first = writeFileSafe(file, "hello")
    expect(first).toEqual({ path: file, skipped: false })
    expect(fs.readFileSync(file, "utf8")).toBe("hello")

    const overwrite = writeFileSafe(file, "updated")
    expect(overwrite).toEqual({ path: file, skipped: false })
    expect(fs.readFileSync(file, "utf8")).toBe("updated")

    const skipped = writeFileSafe(file, "again", { onExists: "skip" })
    expect(skipped).toEqual({ path: file, skipped: true })
    expect(fs.readFileSync(file, "utf8")).toBe("updated")
  })

  it("upsertJson merges data and writes formatted file", () => {
    const file = path.join(setupTemp(), "data.json")
    fs.writeFileSync(file, "{\"a\":1}\n", "utf8")
    const result = upsertJson<{ a: number; b: number }>(file, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
    const expectedBody = `${JSON.stringify({ a: 1, b: 2 }, null, 2)}\n`
    expect(fs.readFileSync(file, "utf8")).toBe(expectedBody)
  })

  it("upsertJson falls back when existing JSON cannot be parsed", () => {
    const file = path.join(setupTemp(), "broken.json")
    fs.writeFileSync(file, "{ not-json", "utf8")
    const result = upsertJson<{ foo: string }>(file, { foo: "bar" })
    expect(result).toEqual({ foo: "bar" })
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ foo: "bar" })
  })
})
