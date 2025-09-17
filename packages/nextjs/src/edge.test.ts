import { describe, expect, it } from 'vitest'
import { hasSessionCookie } from './edge'

describe('edge helpers', () => {
  it('detects presence of session cookie', () => {
    expect(hasSessionCookie('__keyloom_session=abc')).toBe(true)
    expect(hasSessionCookie('other=value')).toBe(false)
  })
})
