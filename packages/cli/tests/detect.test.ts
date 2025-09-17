import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  detectNext,
  detectPackageManager,
  detectRouter,
  detectWorkspaceRoot,
} from "../src/lib/detect"

let root = ""

function tempDir(prefix = "keyloom-detect-") {
  if (!root) root = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return root
}

afterEach(() => {
  if (root && fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true })
  root = ""
})

describe("detect helpers", () => {
  it("walks up to find workspace root markers", () => {
    const base = tempDir()
    fs.writeFileSync(path.join(base, "pnpm-workspace.yaml"), "packages: []")
    const nested = path.join(base, "apps", "web")
    fs.mkdirSync(nested, { recursive: true })
    expect(detectWorkspaceRoot(nested)).toBe(base)
  })

  it("stops at git boundary when workspace file is absent", () => {
    const base = tempDir("keyloom-detect-git-")
    fs.mkdirSync(path.join(base, ".git"))
    const nested = path.join(base, "packages", "app")
    fs.mkdirSync(nested, { recursive: true })
    expect(detectWorkspaceRoot(nested)).toBe(base)
  })

  it("returns start dir when no markers are found", () => {
    const base = tempDir("keyloom-detect-nomarker-")
    const nested = path.join(base, "nested")
    fs.mkdirSync(nested, { recursive: true })
    expect(detectWorkspaceRoot(nested)).toBe(nested)
  })

  it("detects package manager by lockfiles", () => {
    const base = tempDir()
    fs.writeFileSync(path.join(base, "pnpm-lock.yaml"), "")
    expect(detectPackageManager(base)).toBe("pnpm")
    fs.rmSync(path.join(base, "pnpm-lock.yaml"))
    fs.writeFileSync(path.join(base, "yarn.lock"), "")
    expect(detectPackageManager(base)).toBe("yarn")
    fs.rmSync(path.join(base, "yarn.lock"))
    expect(detectPackageManager(base)).toBe("npm")
  })

  it("detects next dependency and router layout", () => {
    const base = tempDir()
    fs.writeFileSync(
      path.join(base, "package.json"),
      JSON.stringify({ dependencies: { next: "14.0.0" } }),
    )
    expect(detectNext(base)).toBe(true)
    const appDir = path.join(base, "app")
    fs.mkdirSync(appDir)
    expect(detectRouter(base)).toBe("next-app")
    fs.rmSync(appDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(base, "pages"))
    expect(detectRouter(base)).toBe("next-pages")
    fs.rmSync(path.join(base, "pages"), { recursive: true, force: true })
    expect(detectRouter(base)).toBe("none")
  })

  it("detectNext handles missing and invalid package manifests", () => {
    const base = tempDir("keyloom-detect-missing-")
    expect(detectNext(base)).toBe(false)

    const pkgPath = path.join(base, "package.json")
    fs.writeFileSync(pkgPath, "{ invalid json", "utf8")
    expect(detectNext(base)).toBe(false)
  })

  it("detects next in dev dependencies", () => {
    const base = tempDir("keyloom-detect-devdep-")
    fs.writeFileSync(
      path.join(base, "package.json"),
      JSON.stringify({ devDependencies: { next: "14.1.0" } }),
    )
    expect(detectNext(base)).toBe(true)
  })
})
