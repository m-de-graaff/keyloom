import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { generateRoutes } from "../src/lib/routes-scan"

let workspace = ""

function setup() {
  if (!workspace) workspace = fs.mkdtempSync(path.join(os.tmpdir(), "keyloom-routes-"))
  return workspace
}

afterEach(() => {
  if (workspace && fs.existsSync(workspace)) {
    fs.rmSync(workspace, { recursive: true, force: true })
  }
  workspace = ""
})

describe("generateRoutes", () => {
  it("scans app and pages directories and creates manifest files", async () => {
    const cwd = setup()
    const appDir = path.join(cwd, "app", "dashboard")
    fs.mkdirSync(appDir, { recursive: true })
    fs.writeFileSync(
      path.join(appDir, "page.tsx"),
      xport const keyloom = {
        visibility: 'private',
        roles: ['admin'],
        org: 'required',
        redirectTo: '/login',
        verify: 'session'
      } as const
    )

    const pagesDir = path.join(cwd, "pages", "api")
    fs.mkdirSync(pagesDir, { recursive: true })
    fs.writeFileSync(
      path.join(pagesDir, "[user].tsx"),
      xport const keyloom = { visibility: 'public' }
    )

    const { count, outJson, outTs } = await generateRoutes({ cwd })
    expect(count).toBe(2)
    expect(fs.existsSync(outJson)).toBe(true)
    expect(fs.existsSync(outTs)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(outJson, "utf8"))
    expect(Array.isArray(manifest.entries)).toBe(true)
    expect(manifest.entries).toHaveLength(2)

    const dashboard = manifest.entries.find((entry: any) => entry.pattern === "/dashboard")
    expect(dashboard).toMatchObject({
      rule: {
        visibility: "private",
        roles: ["admin"],
        org: "required",
        redirectTo: "/login",
        verify: "session",
      },
    })

    const apiRoute = manifest.entries.find((entry: any) => entry.pattern === "/api/[user]")
    expect(apiRoute).toMatchObject({ rule: { visibility: "public" } })
  })

  it("handles projects with no discoverable routes", async () => {
    const cwd = setup()
    const { count, outJson, outTs } = await generateRoutes({ cwd })
    expect(count).toBe(0)
    expect(fs.existsSync(outJson)).toBe(true)
    expect(fs.existsSync(outTs)).toBe(true)
    const manifest = JSON.parse(fs.readFileSync(outJson, "utf8"))
    expect(manifest.entries).toEqual([])
  })
})
