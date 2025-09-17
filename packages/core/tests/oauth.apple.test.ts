import { describe, expect, it, vi } from 'vitest'

import { makeAppleClientSecret } from '../src/oauth/apple'

function toPem(key: ArrayBuffer): string {
  const base64 = Buffer.from(key).toString('base64')
  const wrapped = base64.match(/.{1,64}/g)?.join('\n') ?? base64
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`
}

describe('apple oauth helpers', () => {
  it('builds a signed client secret using ES256', async () => {
    const keyPair = (await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair

    const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    const pem = toPem(pkcs8)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    const token = await makeAppleClientSecret({
      clientId: 'com.example.app',
      teamId: 'TEAMID',
      keyId: 'KEYID',
      privateKey: pem,
      ttlSeconds: 600,
    })

    const parts = token.split('.')
    expect(parts).toHaveLength(3)

    const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'))

    expect(header).toEqual({ alg: 'ES256', kid: 'KEYID', typ: 'JWT' })
    expect(payload).toMatchObject({
      iss: 'TEAMID',
      sub: 'com.example.app',
      aud: 'https://appleid.apple.com',
      iat: 1704067200,
      exp: 1704067800,
    })
    expect(parts[2]!.length).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  it('handles environments without Buffer by using browser fallbacks', async () => {
    const keyPair = (await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    const pem = toPem(pkcs8)

    vi.stubGlobal('Buffer', undefined)
    const token = await makeAppleClientSecret({
      clientId: 'com.example.app',
      teamId: 'TEAMID',
      keyId: 'KEYID',
      privateKey: pem,
    })

    expect(token.split('.')).toHaveLength(3)
    vi.unstubAllGlobals()
  })
})
