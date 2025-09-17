import { describe, expect, it, vi } from 'vitest'

import { issueVerificationToken } from '../src/tokens/verification'

describe('verification tokens', () => {
  it('issues tokens with ttl and timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    const token = issueVerificationToken('user@example.com', 10)

    expect(token.identifier).toBe('user@example.com')
    expect(typeof token.token).toBe('string')
    expect(token.token.length).toBeGreaterThan(10)
    expect(token.createdAt?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(token.expiresAt.getTime()).toBe(1704067800000)

    vi.useRealTimers()
  })
})
