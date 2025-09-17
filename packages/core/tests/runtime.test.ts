import { describe, expect, it, vi } from 'vitest'

import { getCurrentSession } from '../src/runtime/current-session'
import { login } from '../src/runtime/login'
import { logout } from '../src/runtime/logout'
import { register } from '../src/runtime/register'

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseSession = {
  id: 'sess-1',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
}

describe('runtime login', () => {
  it('logs in a user with valid credentials', async () => {
    const adapter = {
      getUserByEmail: vi.fn().mockResolvedValue(baseUser),
      getCredentialByUserId: vi.fn().mockResolvedValue({ hash: 'stored-hash' }),
      createSession: vi.fn().mockResolvedValue(baseSession),
    }
    const hasher = { verify: vi.fn().mockResolvedValue(true) }

    const result = await login({ email: baseUser.email!, password: 'secret' }, {
      adapter: adapter as any,
      hasher,
    })

    expect(result.session).toEqual(baseSession)
    expect(adapter.getUserByEmail).toHaveBeenCalledWith(baseUser.email)
    expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'secret')
  })

  it('fails when user is missing', async () => {
    const adapter = {
      getUserByEmail: vi.fn().mockResolvedValue(null),
      getCredentialByUserId: vi.fn(),
      createSession: vi.fn(),
    }
    const hasher = { verify: vi.fn() }

    await expect(
      login({ email: baseUser.email!, password: 'secret' }, { adapter: adapter as any, hasher }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
  })

  it('fails when credentials are missing or invalid', async () => {
    const adapter = {
      getUserByEmail: vi.fn().mockResolvedValue(baseUser),
      getCredentialByUserId: vi.fn().mockResolvedValue(null),
      createSession: vi.fn(),
    }
    const hasher = { verify: vi.fn() }

    await expect(
      login({ email: baseUser.email!, password: 'secret' }, { adapter: adapter as any, hasher }),
    ).rejects.toMatchObject({ code: 'CREDENTIAL_NOT_FOUND' })

    adapter.getCredentialByUserId.mockResolvedValue({ hash: 'stored-hash' })
    hasher.verify.mockResolvedValue(false)

    await expect(
      login({ email: baseUser.email!, password: 'secret' }, { adapter: adapter as any, hasher }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})

describe('runtime register', () => {
  it('creates a user and credential, invoking audit hook', async () => {
    const adapter = {
      createUser: vi.fn().mockResolvedValue(baseUser),
      createCredential: vi.fn().mockResolvedValue({ id: 'cred-1', userId: baseUser.id }),
    }
    const hasher = { hash: vi.fn().mockResolvedValue('hashed') }
    const audit = vi.fn().mockResolvedValue(undefined)

    const result = await register({ email: baseUser.email!, password: 'secret' }, {
      adapter: adapter as any,
      hasher,
      audit,
    })

    expect(result).toEqual({ user: baseUser, requiresVerification: false })
    expect(adapter.createUser).toHaveBeenCalledWith({
      email: baseUser.email,
      emailVerified: expect.any(Date),
    })
    expect(adapter.createCredential).toHaveBeenCalledWith(baseUser.id, 'hashed')
    expect(audit).toHaveBeenCalledWith('user.created', { userId: baseUser.id })
  })

  it('honours email verification requirement', async () => {
    const adapter = {
      createUser: vi.fn().mockResolvedValue({ ...baseUser, emailVerified: null }),
      createCredential: vi.fn().mockResolvedValue({ id: 'cred', userId: baseUser.id }),
    }
    const hasher = { hash: vi.fn().mockResolvedValue('hashed') }

    const result = await register(
      { email: baseUser.email!, password: 'secret', requireEmailVerify: true },
      { adapter: adapter as any, hasher },
    )

    expect(result.requiresVerification).toBe(true)
    expect(adapter.createUser).toHaveBeenCalledWith({ email: baseUser.email, emailVerified: null })
  })
})

describe('runtime session helpers', () => {
  it('resolves current session and user', async () => {
    const adapter = {
      getSession: vi.fn().mockResolvedValue(baseSession),
      getUser: vi.fn().mockResolvedValue(baseUser),
    }

    const { session, user } = await getCurrentSession('sess-1', adapter as any)
    expect(session).toEqual(baseSession)
    expect(user).toEqual(baseUser)
  })

  it('returns nulls when session or cookie missing', async () => {
    const adapter = {
      getSession: vi.fn().mockResolvedValue(null),
      getUser: vi.fn(),
    }

    expect(await getCurrentSession(null, adapter as any)).toEqual({ session: null, user: null })
    expect(await getCurrentSession('missing', adapter as any)).toEqual({ session: null, user: null })
  })

  it('delegates logout to adapter', async () => {
    const adapter = { deleteSession: vi.fn().mockResolvedValue(undefined) }
    await logout('sess-1', adapter as any)
    expect(adapter.deleteSession).toHaveBeenCalledWith('sess-1')
  })
})
