import { afterEach, describe, expect, it, vi } from 'vitest'
import { memoryAdapter } from '../../src/adapters/memory'
import { completeOAuth, startOAuth } from '../../src/oauth/flow'
import type { OAuthProvider } from '../../src/oauth/types'

const baseProvider: OAuthProvider & { clientId: string; clientSecret: string } = {
  id: 'test',
  authorization: { url: 'https://example.com/authorize' },
  token: { url: 'https://example.com/token', style: 'json' },
  userinfo: {
    url: 'https://example.com/userinfo',
    map: (raw) => ({
      id: raw.id,
      name: raw.name,
      email: raw.email ?? null,
      image: raw.avatar_url ?? null,
    }),
  },
  scopes: [],
  clientId: 'test-id',
  clientSecret: 'test-secret',
}

const baseUrl = 'http://localhost:3000'
const callbackPath = '/api/auth/callback/test'
const secrets = { authSecret: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY' } // base64url-encoded 32-byte secret

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Profile Overrides', () => {
  it('should apply profile overrides when creating a new user', async () => {
    // Mock the OAuth client functions
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        token_type: 'Bearer',
      }),
      fetchUserInfo: vi.fn().mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      }),
    }))

    const providerWithOverrides = {
      ...baseProvider,
      profileOverrides: (profile: any) => ({
        firstName: profile.name?.split(' ')[0] ?? null,
        lastName: profile.name?.split(' ')[1] ?? null,
        fullName: profile.name, // Keep original name as fullName
      }),
    }

    const adapter = memoryAdapter()
    const { stateCookie } = await startOAuth({
      provider: providerWithOverrides,
      baseUrl,
      callbackPath,
      secrets,
    })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    const { session } = await completeOAuth({
      provider: providerWithOverrides,
      adapter,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code: 'test-code',
      secrets,
    })

    // Verify the user was created with overridden fields
    const user = await adapter.getUser(session.userId)
    expect(user).toBeTruthy()
    expect(user?.email).toBe('john@example.com')
    expect(user?.name).toBe('John Doe') // Original name field
    expect((user as any)?.firstName).toBe('John') // Override field
    expect((user as any)?.lastName).toBe('Doe') // Override field
    expect((user as any)?.fullName).toBe('John Doe') // Override field
  })

  it('should work without profile overrides (backward compatibility)', async () => {
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        token_type: 'Bearer',
      }),
      fetchUserInfo: vi.fn().mockResolvedValue({
        id: 'user-456',
        name: 'Jane Smith',
        email: 'jane@example.com',
      }),
    }))

    const adapter = memoryAdapter()
    const { stateCookie } = await startOAuth({
      provider: baseProvider,
      baseUrl,
      callbackPath,
      secrets,
    })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    const { session } = await completeOAuth({
      provider: baseProvider,
      adapter,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code: 'test-code',
      secrets,
    })

    // Verify the user was created with standard fields only
    const user = await adapter.getUser(session.userId)
    expect(user).toBeTruthy()
    expect(user?.email).toBe('jane@example.com')
    expect(user?.name).toBe('Jane Smith')
    expect((user as any)?.firstName).toBeUndefined()
    expect((user as any)?.lastName).toBeUndefined()
  })

  it('should handle profile overrides that remove fields', async () => {
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        token_type: 'Bearer',
      }),
      fetchUserInfo: vi.fn().mockResolvedValue({
        id: 'user-789',
        name: 'Bob Wilson',
        email: 'bob@example.com',
      }),
    }))

    const providerWithOverrides = {
      ...baseProvider,
      profileOverrides: (profile: any) => ({
        displayName: profile.name,
        name: undefined, // Remove the original name field
      }),
    }

    const adapter = memoryAdapter()
    const { stateCookie } = await startOAuth({
      provider: providerWithOverrides,
      baseUrl,
      callbackPath,
      secrets,
    })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    const { session } = await completeOAuth({
      provider: providerWithOverrides,
      adapter,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code: 'test-code',
      secrets,
    })

    // Verify the user was created with overridden fields
    const user = await adapter.getUser(session.userId)
    expect(user).toBeTruthy()
    expect(user?.email).toBe('bob@example.com')
    expect(user?.name).toBeUndefined() // Should be undefined due to override
    expect((user as any)?.displayName).toBe('Bob Wilson') // Override field
  })
})
