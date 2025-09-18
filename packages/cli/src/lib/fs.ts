import fs from 'node:fs'
import path from 'node:path'

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

export type OnExists = 'prompt' | 'skip' | 'overwrite'

export function writeFileSafe(p: string, content: string, opts: { onExists?: OnExists } = {}) {
  ensureDir(path.dirname(p))
  const exists = fs.existsSync(p)
  if (exists && opts.onExists === 'skip') return { path: p, skipped: true }
  fs.writeFileSync(p, content, 'utf8')
  return { path: p, skipped: false }
}

export function upsertJson<T extends object>(p: string, merge: Partial<T>) {
  ensureDir(path.dirname(p))
  let current: any = {}
  if (fs.existsSync(p)) {
    try {
      current = JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {}
  }
  const next = { ...current, ...merge }
  fs.writeFileSync(p, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next as T
}
