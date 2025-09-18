import fs from 'node:fs'
import path from 'node:path'

export type PackageManager = 'pnpm' | 'npm' | 'yarn'
export type Router = 'next-app' | 'next-pages' | 'none'

export function detectWorkspaceRoot(startDir = process.cwd()): string {
  let dir = startDir
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    dir = path.dirname(dir)
  }
  return startDir
}

export function detectPackageManager(cwd = process.cwd()): PackageManager {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

export function detectNext(cwd = process.cwd()): boolean {
  try {
    const pkgPath = path.join(cwd, 'package.json')
    if (!fs.existsSync(pkgPath)) return false
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    return Boolean(all.next)
  } catch {
    return false
  }
}

export function detectRouter(cwd = process.cwd()): Router {
  if (fs.existsSync(path.join(cwd, 'app'))) return 'next-app'
  if (fs.existsSync(path.join(cwd, 'pages'))) return 'next-pages'
  return 'none'
}
