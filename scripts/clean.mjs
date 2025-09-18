#!/usr/bin/env node
// Cross-platform monorepo cleaner for Keyloom
// - Removes packages/*/dist
// - Removes stray TypeScript declarations under packages/*/src/** (only .d.ts and .d.ts.map)
// - Removes node_modules/.cache at root and under each package
// - Safe and idempotent: ignores missing paths
import fs from 'node:fs/promises'
import path from 'node:path'

async function pathExists(p) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function rmrf(p) {
  try {
    await fs.rm(p, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else {
      yield full
    }
  }
}

async function cleanPackage(pkgDir) {
  const dist = path.join(pkgDir, 'dist')
  await rmrf(dist)

  const srcDir = path.join(pkgDir, 'src')
  if (await pathExists(srcDir)) {
    for await (const file of walk(srcDir)) {
      if (file.endsWith('.d.ts') || file.endsWith('.d.ts.map')) {
        await rmrf(file)
      }
    }
  }

  const cacheDir = path.join(pkgDir, 'node_modules', '.cache')
  await rmrf(cacheDir)
}

async function main() {
  const root = process.cwd()
  const rootCache = path.join(root, 'node_modules', '.cache')
  await rmrf(rootCache)

  const packagesDir = path.join(root, 'packages')
  if (await pathExists(packagesDir)) {
    const items = await fs.readdir(packagesDir, { withFileTypes: true })
    for (const d of items) {
      if (d.isDirectory()) {
        await cleanPackage(path.join(packagesDir, d.name))
      }
    }
  }

  console.log(
    'Clean complete: dist/, stray .d.ts/.d.ts.map in src/, and node_modules/.cache removed',
  )
}

main().catch((err) => {
  console.error('Clean script failed:', err)
  process.exit(1)
})
