import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDefaultRotationPolicy,
  createKeystore,
  ensureKeystoreFile,
  exportPublicJwks,
  loadKeystoreFromFile,
  rotateKeystoreFile,
  saveKeystoreToFile,
} from '../src/jwt/jwks'

describe('jwt/jwks file storage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keyloom-jwks-'))
  const file = join(dir, 'jwks.json')

  it('saves and loads a keystore', async () => {
    const ks = await createKeystore('EdDSA')
    await saveKeystoreToFile(file, ks)
    const loaded = await loadKeystoreFromFile(file)
    expect(loaded.active.kid).toBe(ks.active.kid)
    const pub = exportPublicJwks(loaded)
    expect(pub.keys.length).toBeGreaterThan(0)
  })

  it('ensures file and rotates with overlap', async () => {
    const ks = await ensureKeystoreFile(file, 'EdDSA')
    const policy = createDefaultRotationPolicy()
    const rotated = await rotateKeystoreFile(file, 'EdDSA', policy)
    expect(rotated.active.kid).not.toBe(ks.active.kid)
    // previous contains the old public key
    expect(rotated.previous.length).toBeGreaterThanOrEqual(1)
  })

  it('cleanup', () => {
    rmSync(dir, { recursive: true, force: true })
    expect(true).toBe(true)
  })
})

