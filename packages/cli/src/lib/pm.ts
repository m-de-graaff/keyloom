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
  const have = new Set<string>(Object.keys({ ...(pkg?.dependencies||{}), ...(pkg?.devDependencies||{}) }))
  return wanted.filter((d) => !have.has(parseName(d)))
}

function parseName(spec: string) {
  // normalize '@scope/name@^1' -> '@scope/name'
  if (spec.startsWith('@')) {
    const parts = spec.split('@')
    return '@' + parts[1]
  }
  return spec.split('@')[0]
}

export async function installPackages(opts: {
  cwd: string
  manager: PackageManager
  packages: string[]
  dev?: boolean
}): Promise<void> {
  if (!opts.packages.length) return
  const args: string[] = []
  if (opts.manager === 'pnpm') {
    args.push('pnpm', 'add')
    if (opts.dev) args.push('-D')
    args.push(...opts.packages)
  } else if (opts.manager === 'yarn') {
    args.push('yarn', 'add')
    if (opts.dev) args.push('-D')
    args.push(...opts.packages)
  } else {
    args.push('npm', 'install')
    if (opts.dev) args.push('--save-dev')
    args.push(...opts.packages)
  }
  await execShell(args.join(' '), opts.cwd)
}

function execShell(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: 'ignore' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed (${code}): ${cmd}`))
    })
  })
}

