import path from 'node:path'
import { ensureDir, writeFileSafe } from '../fs'

export function writeDrizzleConfig(cwd: string, body: string) {
  const p = path.join(cwd, 'drizzle.config.ts')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}

export function writeDrizzleSchema(cwd: string, body: string) {
  const p = path.join(cwd, 'src', 'db', 'schema', 'keyloom.ts')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}
