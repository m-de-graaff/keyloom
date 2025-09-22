import fs from 'node:fs'
import path from 'node:path'
import inquirer from 'inquirer'

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

export async function detectPackageManager(
  cwd = process.cwd(),
  override?: PackageManager | string,
): Promise<PackageManager> {
  // Explicit override via flag
  if (override === 'pnpm' || override === 'yarn' || override === 'npm') return override

  // Lockfile-based detection
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm'

  // No lockfile found — ask the user interactively
  try {
    const ans = (await (inquirer as any).prompt([
      {
        name: 'pm',
        type: 'list',
        message: 'No lockfile found. Select a package manager to use for installing dependencies:',
        choices: [
          { name: 'pnpm (recommended)', value: 'pnpm' },
          { name: 'yarn', value: 'yarn' },
          { name: 'npm', value: 'npm' },
        ],
        default: 'pnpm',
      },
    ])) as { pm: PackageManager }
    return ans.pm
  } catch {
    // Fall back to npm if prompt fails (non-interactive)
    return 'npm'
  }
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
