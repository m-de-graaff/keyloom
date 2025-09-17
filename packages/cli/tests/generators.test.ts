import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeCustomAdapterSkeleton } from '../src/lib/generators/custom-adapter'
import { writeDrizzleConfig, writeDrizzleSchema } from '../src/lib/generators/drizzle'
import {
  writeAppHandler,
  writeEnvExample,
  writeJWKS,
  writeKeyloomConfig,
  writeMiddleware,
  writePagesHandler,
} from '../src/lib/generators/files'
import { appendPrismaRbacPartial, writePrismaSchemaBase } from '../src/lib/generators/prisma'

let cwd = ''

function tempWorkspace() {
  if (!cwd) cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'keyloom-generators-'))
  return cwd
}

afterEach(() => {
  if (cwd && fs.existsSync(cwd)) {
    fs.rmSync(cwd, { recursive: true, force: true })
  }
  cwd = ''
})

describe('cli generators', () => {
  it('writes config files in expected locations', () => {
    const dir = tempWorkspace()
    const config = writeKeyloomConfig(dir, 'export default {}')
    const middleware = writeMiddleware(dir, 'export const config = {}')
    expect(config).toMatchObject({ path: path.join(dir, 'keyloom.config.ts'), skipped: false })
    expect(middleware).toMatchObject({ path: path.join(dir, 'middleware.ts'), skipped: false })
    expect(fs.readFileSync(path.join(dir, 'keyloom.config.ts'), 'utf8')).toBe('export default {}')
    expect(fs.readFileSync(path.join(dir, 'middleware.ts'), 'utf8')).toBe(
      'export const config = {}',
    )
  })

  it('writes next handlers and jwks variants', () => {
    const dir = tempWorkspace()
    writeAppHandler(dir, 'export const GET = () => null')
    writePagesHandler(dir, 'export default function handler() {}')
    writeEnvExample(dir, 'KEY=VALUE')

    const jwksOnly = writeJWKS(dir, '{"keys":[]}')
    expect(jwksOnly.priv.skipped).toBe(false)
    expect(jwksOnly.pub).toBeUndefined()

    const { priv, pub } = writeJWKS(dir, '{"keys":[1]}', '{"keys":[2]}')
    expect(fs.existsSync(priv.path)).toBe(true)
    expect(pub).toMatchObject({ path: path.join(dir, 'public.jwks.json'), skipped: false })

    expect(
      fs.readFileSync(path.join(dir, 'app', 'api', 'auth', '[[...keyloom]]', 'route.ts'), 'utf8'),
    ).toBe('export const GET = () => null')
    expect(fs.readFileSync(path.join(dir, 'pages', 'api', 'auth', '[...keyloom].ts'), 'utf8')).toBe(
      'export default function handler() {}',
    )
    expect(fs.readFileSync(path.join(dir, '.env.example'), 'utf8')).toBe('KEY=VALUE')
  })

  it('writes adapter and orm scaffolding with overwrite behaviour', () => {
    const dir = tempWorkspace()
    writeCustomAdapterSkeleton(dir, 'export default {}')
    writeDrizzleConfig(dir, 'export default {}')
    writeDrizzleSchema(dir, 'export const schema = {}')
    writePrismaSchemaBase(dir, 'datasource db {}')

    const prismaPath = path.join(dir, 'prisma', 'schema.prisma')
    appendPrismaRbacPartial(dir, 'model User {}')
    expect(fs.readFileSync(prismaPath, 'utf8')).toBe('model User {}')

    const adapterPath = path.join(dir, 'src', 'keyloom', 'adapter.ts')
    expect(fs.readFileSync(adapterPath, 'utf8')).toBe('export default {}')
    expect(fs.readFileSync(path.join(dir, 'drizzle.config.ts'), 'utf8')).toBe('export default {}')
    expect(fs.readFileSync(path.join(dir, 'src', 'db', 'schema', 'keyloom.ts'), 'utf8')).toBe(
      'export const schema = {}',
    )

    writeCustomAdapterSkeleton(dir, 'export default { overwritten: true }')
    expect(fs.readFileSync(adapterPath, 'utf8')).toBe('export default { overwritten: true }')
  })
})
