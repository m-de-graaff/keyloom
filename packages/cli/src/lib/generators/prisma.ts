import path from 'node:path'
import { ensureDir, writeFileSafe } from '../fs'

export function writePrismaSchemaBase(cwd: string, body: string) {
  const p = path.join(cwd, 'prisma', 'schema.prisma')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}

export function appendPrismaRbacPartial(cwd: string, partial: string) {
  const p = path.join(cwd, 'prisma', 'schema.prisma')
  return writeFileSafe(p, partial, { onExists: 'overwrite' })
}
