import { describe, it, expect } from 'vitest'
import { issueInviteToken } from '../src/rbac/invites'
import { tokenHash } from '../src/crypto/token-hash'

describe('rbac/invites', () => {
  it('issues token with matching hash and ttl', async () => {
    const out = await issueInviteToken('a@b.co', 'org1', 'member', 'secret', 10)
    expect(out.token).toBeDefined()
    expect(out.tokenHash).toBe(await tokenHash(out.token, 'secret'))
    const diffMs = out.expiresAt.getTime() - Date.now()
    expect(diffMs).toBeGreaterThan(9 * 60_000)
    expect(diffMs).toBeLessThan(11 * 60_000)
  })
})

