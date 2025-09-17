import { describe, expect, it, vi } from 'vitest'

const argonHash = vi.fn(async (pw: string) => `argon:${pw}`)
const argonVerify = vi.fn(async () => true)
const bcryptHash = vi.fn(async (pw: string) => `bcrypt:${pw}`)
const bcryptCompare = vi.fn(async () => true)

vi.mock('@node-rs/argon2', () => ({ hash: argonHash, verify: argonVerify }))
vi.mock('bcryptjs', () => ({ hash: bcryptHash, compare: bcryptCompare }))

import { argon2idHasher, bcryptHasher, devHasher } from '../src/crypto/hash'

describe('password hashers', () => {
  it('dev hasher prefixes password', async () => {
    const hash = await devHasher.hash('pw')
    expect(hash).toBe('noop:pw')
    expect(await devHasher.verify(hash, 'pw')).toBe(true)
  })

  it('argon2 hasher delegates to module', async () => {
    const hash = await argon2idHasher.hash('pw')
    expect(hash).toBe('argon:pw')
    expect(argonHash).toHaveBeenCalledWith('pw', expect.any(Object))
    expect(await argon2idHasher.verify('hash', 'pw')).toBe(true)
    expect(argonVerify).toHaveBeenCalledWith('hash', 'pw')
  })

  it('bcrypt hasher delegates to module', async () => {
    const hash = await bcryptHasher.hash('pw')
    expect(hash).toBe('bcrypt:pw')
    expect(bcryptHash).toHaveBeenCalledWith('pw', 12)
    expect(await bcryptHasher.verify('hash', 'pw')).toBe(true)
    expect(bcryptCompare).toHaveBeenCalledWith('pw', 'hash')
  })
})
