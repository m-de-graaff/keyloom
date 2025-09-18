import path from 'node:path'
import { ensureDir, writeFileSafe } from '../fs'

export type InitFilesInput = {
  cwd: string
  target: 'next-app' | 'next-pages' | 'express' | 'config-only'
  adapter: 'prisma' | 'drizzle' | 'pg' | 'mysql2' | 'mongo' | 'custom' | undefined
  providers: string[]
  rbac: boolean
  sessionStrategy: 'database' | 'jwt'
  baseUrl: string
}

export function writeKeyloomConfig(cwd: string, body: string) {
  return writeFileSafe(path.join(cwd, 'keyloom.config.ts'), body, { onExists: 'overwrite' })
}

export function writeMiddleware(cwd: string, body: string) {
  return writeFileSafe(path.join(cwd, 'middleware.ts'), body, { onExists: 'overwrite' })
}

export function writeAppHandler(cwd: string, body: string) {
  const p = path.join(cwd, 'app', 'api', 'auth', '[[...keyloom]]', 'route.ts')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}

export function writePagesHandler(cwd: string, body: string) {
  const p = path.join(cwd, 'pages', 'api', 'auth', '[...keyloom].ts')
  ensureDir(path.dirname(p))
  return writeFileSafe(p, body, { onExists: 'overwrite' })
}

export function writeEnvExample(cwd: string, body: string) {
  return writeFileSafe(path.join(cwd, '.env.example'), body, { onExists: 'overwrite' })
}

export function writeJWKS(cwd: string, privateJwks: string, publicJwks?: string) {
  const priv = writeFileSafe(path.join(cwd, 'keyloom.jwks.json'), privateJwks, {
    onExists: 'overwrite',
  })
  let pub: any
  if (publicJwks)
    pub = writeFileSafe(path.join(cwd, 'public.jwks.json'), publicJwks, { onExists: 'overwrite' })
  return { priv, pub }
}
