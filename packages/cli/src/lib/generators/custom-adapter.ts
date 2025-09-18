import path from 'node:path'
import { ensureDir, writeFileSafe } from '../fs'

export function writeCustomAdapterSkeleton(cwd: string, body: string) {
  const p = path.join(cwd, 'src', 'keyloom', 'adapter.ts')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}
