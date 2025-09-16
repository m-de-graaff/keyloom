import { describe, expect, it } from 'vitest'
import { matchApiPath } from './routing'

describe('matchApiPath', () => {
  it('should match session route', () => {
    expect(matchApiPath('/api/auth/session')).toEqual({ kind: 'session' })
    expect(matchApiPath('/some/prefix/api/auth/session')).toEqual({ kind: 'session' })
  })

  it('should match csrf route', () => {
    expect(matchApiPath('/api/auth/csrf')).toEqual({ kind: 'csrf' })
    expect(matchApiPath('/app/api/auth/csrf')).toEqual({ kind: 'csrf' })
  })

  it('should match register route', () => {
    expect(matchApiPath('/api/auth/register')).toEqual({ kind: 'register' })
  })

  it('should match login route', () => {
    expect(matchApiPath('/api/auth/login')).toEqual({ kind: 'login' })
  })

  it('should match logout route', () => {
    expect(matchApiPath('/api/auth/logout')).toEqual({ kind: 'logout' })
  })

  it('should return null for unknown routes', () => {
    expect(matchApiPath('/api/auth/unknown')).toBeNull()
    expect(matchApiPath('/not-auth')).toBeNull()
    expect(matchApiPath('')).toBeNull()
  })

  it('should handle edge cases', () => {
    expect(matchApiPath('/')).toBeNull()
    expect(matchApiPath('/session')).toEqual({ kind: 'session' })
    expect(matchApiPath('session')).toEqual({ kind: 'session' })
  })
})
