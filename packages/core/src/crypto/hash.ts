export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  id: 'argon2id' | 'bcrypt' | 'scrypt' | 'noop'
}

// Phase 1: noop/dev impl for compile-time + tests (NOT for prod).
export const devHasher: PasswordHasher = {
  id: 'noop',
  async hash(pw) {
    return `noop:${pw}`
  },
  async verify(hash, pw) {
    return hash === `noop:${pw}`
  },
}

// Node-only (server) implementations, loaded dynamically to avoid Edge bundling
export const argon2idHasher: PasswordHasher = {
  id: 'argon2id',
  async hash(pw) {
    const argon2 = await import('@node-rs/argon2')
    return argon2.hash(pw, {
      memoryCost: 1 << 17,
      timeCost: 2,
      parallelism: 2,
      variant: 2,
    })
  },
  async verify(hash, pw) {
    const argon2 = await import('@node-rs/argon2')
    return argon2.verify(hash, pw)
  },
}

export const bcryptHasher: PasswordHasher = {
  id: 'bcrypt',
  async hash(pw) {
    const { hash } = await import('bcryptjs')
    return hash(pw, 12)
  },
  async verify(hashVal, pw) {
    const { compare } = await import('bcryptjs')
    return compare(pw, hashVal)
  },
}
