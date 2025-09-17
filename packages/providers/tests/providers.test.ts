import { describe, expect, it, vi } from 'vitest'

vi.mock('@keyloom/core', async () => {
  const actual = await vi.importActual<any>('@keyloom/core')
  return {
    ...actual,
    makeAppleClientSecret: vi.fn().mockResolvedValue('signed-secret'),
  }
})

import apple from '../src/apple'
import auth0 from '../src/auth0'
import dev from '../src/dev'
import discord from '../src/discord'
import github, { github as githubFactory } from '../src/github'
import gitlab from '../src/gitlab'
import google from '../src/google'
import microsoft from '../src/microsoft'
import x from '../src/x'

describe('provider factories', () => {
  it('returns expected provider ids and endpoints', async () => {
    const providers = [
      {
        id: 'apple',
        factory: () =>
          apple({
            clientId: 'id',
            teamId: 'team',
            keyId: 'key',
            privateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
          }),
      },
      {
        id: 'auth0',
        factory: () =>
          auth0({ clientId: 'id', clientSecret: 'secret', domain: 'tenant.auth0.com' }),
      },
      { id: 'dev', factory: () => dev() },
      { id: 'discord', factory: () => discord({ clientId: 'id', clientSecret: 'secret' }) },
      { id: 'github', factory: () => github({ clientId: 'id', clientSecret: 'secret' }) },
      {
        id: 'gitlab',
        factory: () =>
          gitlab({ clientId: 'id', clientSecret: 'secret', baseUrl: 'https://gitlab.com' }),
      },
      { id: 'google', factory: () => google({ clientId: 'id', clientSecret: 'secret' }) },
      {
        id: 'microsoft',
        factory: () => microsoft({ clientId: 'id', clientSecret: 'secret', tenantId: 'tenant' }),
      },
      { id: 'x', factory: () => x({ clientId: 'id', clientSecret: 'secret' }) },
    ]

    for (const { id, factory } of providers) {
      const provider = factory()
      expect(provider.id).toBe(id)
      expect(provider.authorization?.url).toMatch(/^https?:\/\//)

      if (
        provider.userinfo &&
        typeof provider.userinfo === 'object' &&
        'map' in provider.userinfo
      ) {
        const mapped = provider.userinfo.map({
          id: '123',
          email: 'user@example.com',
          name: 'User Name',
          login: 'username',
          username: 'username',
          global_name: 'Global User',
          avatar_url: 'https://images.example/avatar.png',
          avatar: 'avatarhash',
        })
        expect(mapped).toHaveProperty('id')
      }

      if ('profile' in provider && typeof provider.profile === 'function') {
        expect(provider.profile({ id: 1 })).toHaveProperty('id')
      }

      if ('profileFromIdToken' in provider && typeof provider.profileFromIdToken === 'function') {
        provider.profileFromIdToken({
          sub: 'abc',
          email: 'user@example.com',
          name: 'User Name',
          email_verified: 'true',
        })
      }

      if (
        provider.token &&
        typeof provider.token === 'object' &&
        'customizeBody' in provider.token
      ) {
        await provider.token.customizeBody(new URLSearchParams())
      }
    }
  })

  it('exports both default and named github factory', () => {
    expect(github).toBe(githubFactory)
  })
})
