import { readFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import type { PackageManager } from './detect'

export function readPackageJson(cwd: string): any | null {
  try {
    const p = path.join(cwd, 'package.json')
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function getMissingPackages(cwd: string, wanted: string[]): string[] {
  const pkg = readPackageJson(cwd)
  const have = new Set<string>(
    Object.keys({ ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) }),
  )
  const list: string[] = wanted.filter((d): d is string => typeof d === 'string')
  const missing: string[] = []
  for (const dep of list) {
    const name = parseName(dep)
    if (!have.has(name as string)) missing.push(dep)
  }
  return missing
}

function parseName(spec: string) {
  // normalize '@scope/name@^1' -> '@scope/name'
  if (spec.startsWith('@')) {
    const parts = spec.split('@')
    return '@' + parts[1]
  }
  return spec.split('@')[0]
}

export function buildInstallCommand(
  manager: PackageManager,
  packages: string[],
  dev?: boolean,
): string {
  const args: string[] = []
  if (manager === 'pnpm') {
    args.push('pnpm', 'add')
    if (dev) args.push('-D')
  } else if (manager === 'yarn') {
    args.push('yarn', 'add')
    if (dev) args.push('-D')
  } else {
    args.push('npm', 'install')
    if (dev) args.push('--save-dev')
  }
  args.push(...packages)
  return args.join(' ')
}

export async function installPackages(opts: {
  cwd: string
  manager: PackageManager
  packages: string[]
  dev?: boolean
}): Promise<void> {
  if (!opts.packages.length) return
  const cmd = buildInstallCommand(opts.manager, opts.packages, opts.dev)
  await execShell(cmd, opts.cwd)
}

function execShell(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: 'inherit' })
    child.on('error', (err) => reject(err))
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed (${code}): ${cmd}`))
    })
  })
}
