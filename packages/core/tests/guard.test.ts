import { describe, expect, it, vi } from 'vitest'

import * as random from '../src/crypto/random'
import { issueCsrfToken, validateDoubleSubmit } from '../src/guard/csrf'
import { rateLimit } from '../src/guard/rate-limit'

describe('guard helpers', () => {
  it('issues CSRF tokens via randToken', () => {
    const spy = vi.spyOn(random, 'randToken').mockReturnValue('stub-token')
    expect(issueCsrfToken()).toBe('stub-token')
    spy.mockRestore()
  })

  it('validates the double submit pattern', () => {
    expect(validateDoubleSubmit({ cookieToken: 'a', headerToken: 'a' })).toBe(true)
    expect(validateDoubleSubmit({ cookieToken: 'a', headerToken: 'b' })).toBe(false)
    expect(validateDoubleSubmit({ cookieToken: null, headerToken: 'a' })).toBe(false)
  })

  it('enforces simple token bucket rate limits', () => {
    vi.useFakeTimers()
    const key = `bucket-${crypto.randomUUID()}`

    expect(rateLimit(key, { capacity: 2, refillPerSec: 1 })).toBe(true)
    expect(rateLimit(key, { capacity: 2, refillPerSec: 1 })).toBe(true)
    expect(rateLimit(key, { capacity: 2, refillPerSec: 1 })).toBe(false)

    vi.advanceTimersByTime(1000)
    expect(rateLimit(key, { capacity: 2, refillPerSec: 1 })).toBe(true)

    vi.useRealTimers()
  })
})
