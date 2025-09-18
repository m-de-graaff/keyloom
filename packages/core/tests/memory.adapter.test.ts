import { describe, expect, it } from 'vitest'
import { memoryAdapter } from '../src/adapters/memory'

function accountInput(userId: string) {
  return {
    id: 'acct-fixed' as any,
    userId,
    provider: 'github',
    providerAccountId: '123',
  }
}

describe('memory adapter', () => {
  it('enforces unique emails and updates lookups', async () => {
    const adapter = memoryAdapter()
    expect(await adapter.getUser('missing' as any)).toBeNull()

    const first = await adapter.createUser({ email: 'user@example.com' })
    await expect(adapter.createUser({ email: 'user@example.com' })).rejects.toThrow(/EMAIL_EXISTS/)

    const anonymous = await adapter.createUser({ name: 'No Email' })
    expect(anonymous.email).toBeNull()
    expect(await adapter.getUserByEmail('missing@example.com')).toBeNull()

    const updated = await adapter.updateUser(first.id, {
      email: 'other@example.com',
    })
    expect(updated.email).toBe('other@example.com')
    expect(await adapter.getUserByEmail('other@example.com')).not.toBeNull()
    expect(await adapter.getUserByEmail('user@example.com')).toBeNull()

    const second = await adapter.createUser({ email: 'second@example.com' })
    await expect(adapter.updateUser(second.id, { email: 'other@example.com' })).rejects.toThrow(
      /EMAIL_EXISTS/,
    )

    await expect(adapter.updateUser('missing', { email: 'none' })).rejects.toThrow(/USER_NOT_FOUND/)
  })

  it('prevents duplicate account links and manages sessions', async () => {
    const adapter = memoryAdapter()
    const user = await adapter.createUser({ email: 'acc@example.com' })

    const acc = await adapter.linkAccount({ ...accountInput(user.id) })
    expect(acc.id).toBeDefined()
    expect(await adapter.getAccountByProvider('github', '123')).not.toBeNull()
    expect(await adapter.getAccountByProvider('github', 'missing')).toBeNull()
    await expect(adapter.linkAccount({ ...accountInput(user.id) })).rejects.toThrow(
      /ACCOUNT_LINKED/,
    )

    const session = await adapter.createSession({
      userId: user.id,
      expiresAt: new Date(),
    })
    expect(await adapter.getSession(session.id)).not.toBeNull()
    await adapter.deleteSession(session.id)
    expect(await adapter.getSession(session.id)).toBeNull()
  })

  it('handles verification tokens and credentials lifecycle', async () => {
    const adapter = memoryAdapter({ tokenSecret: 'test-secret' })
    const user = await adapter.createUser({ email: 'cred@example.com' })

    const vt = await adapter.createVerificationToken({
      identifier: user.email ?? '',
      token: 'tkn',
      expiresAt: new Date(Date.now() + 1000),
    })

    // verify hashed-at-rest
    const stored = Array.from(adapter.__store.tokens.values()).find((t) => t.id === vt.id)!
    expect(stored.token).not.toBe(vt.token)
    expect(adapter.__store.tokens.has(`${vt.identifier}:${vt.token}`)).toBe(false)

    expect(await adapter.useVerificationToken(vt.identifier, vt.token)).toMatchObject({ id: vt.id })
    expect(await adapter.useVerificationToken(vt.identifier, vt.token)).toBeNull()

    expect(await (adapter as any).getCredentialByUserId('missing' as any)).toBeNull()

    const created = await (adapter as any).createCredential(user.id, 'hash-1')
    expect(created.userId).toBe(user.id)
    await expect((adapter as any).createCredential(user.id, 'hash-2')).rejects.toMatchObject({
      code: 'CREDENTIAL_EXISTS',
    })

    const record = await (adapter as any).getCredentialByUserId(user.id)
    expect(record?.hash).toBe('hash-1')
    await (adapter as any).updateCredential(user.id, 'hash-3')
    expect((await (adapter as any).getCredentialByUserId(user.id))?.hash).toBe('hash-3')

    adapter.__store.credentials.delete(created.id)
    await expect((adapter as any).updateCredential(user.id, 'hash-4')).rejects.toMatchObject({
      code: 'CREDENTIAL_NOT_FOUND',
    })

    await expect((adapter as any).updateCredential('missing', 'hash')).rejects.toMatchObject({
      code: 'CREDENTIAL_NOT_FOUND',
    })
  })

  it('records audit events with generated ids', async () => {
    const adapter = memoryAdapter()
    await adapter.appendAudit({ type: 'login', at: new Date() })
    expect(adapter.__store.audit).toHaveLength(1)
    expect(adapter.__store.audit[0]).toMatchObject({ type: 'login' })
    expect(adapter.__store.audit[0].id).toBeDefined()
  })

  it('reuses provided memory store instance', async () => {
    const base = memoryAdapter()
    const reused = memoryAdapter({ store: base.__store })
    const user = await reused.createUser({ email: 'shared@example.com' })
    expect(await base.getUser(user.id)).not.toBeNull()
  })
})
