import { PrismaAdapter, createRefreshTokenStore } from '@keyloom/adapters/prisma'
import { PrismaClient } from '@prisma/client'
import * as core from '@keyloom/core'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    cookies?: { __keyloom_csrf?: string }
  }
}

import { clearSessionCookie, setSessionCookie } from '../cookies'
import { initializeGlobalKeystore } from '../keystore'
import { initializeJwtService, getJwtService } from '../jwt-service'
import { setJwtCookies, clearJwtCookies, extractRefreshToken } from '../jwt-cookies'
import { setupJwks } from './jwks'

export function buildServer(env: {
  DATABASE_URL: string
  AUTH_SECRET: string
  COOKIE_DOMAIN?: string | undefined
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none'
  SESSION_STRATEGY: 'database' | 'jwt'
  JWT_ISSUER?: string
  JWT_AUDIENCE?: string
  JWT_ACCESS_TTL?: string
  JWT_REFRESH_TTL?: string
  JWT_ALGORITHM?: 'EdDSA' | 'ES256'
  JWT_CLOCK_SKEW_SEC?: number
  JWT_INCLUDE_ORG_ROLE?: boolean
  JWKS_PATH?: string
  KEY_ROTATION_DAYS?: number
  KEY_OVERLAP_DAYS?: number
}) {
  const app = Fastify({ trustProxy: true })
  const db = new PrismaClient()
  const adapter = PrismaAdapter(db)
  const hasher = core.argon2idHasher

  // Initialize JWT components if using JWT strategy
  let jwtService: ReturnType<typeof getJwtService> | null = null
  if (env.SESSION_STRATEGY === 'jwt') {
    // Initialize keystore
    initializeGlobalKeystore({
      jwksPath: env.JWKS_PATH,
      alg: env.JWT_ALGORITHM || 'EdDSA',
      rotationDays: env.KEY_ROTATION_DAYS || 90,
      overlapDays: env.KEY_OVERLAP_DAYS || 7
    }).catch(console.error)

    // Initialize JWT service
    const refreshTokenStore = createRefreshTokenStore(db)
    jwtService = initializeJwtService(env as any, refreshTokenStore)

    // Setup JWKS endpoints
    setupJwks(app)
  }

  app.get('/v1/auth/csrf', async (_req, reply) => {
    const t = core.csrf.issueCsrfToken()
    reply.header('Set-Cookie', `__keyloom_csrf=${t}; Path=/; SameSite=Lax; HttpOnly; Secure`)
    return { csrfToken: t }
  })

  app.post(
    '/v1/auth/register',
    async (
      req: FastifyRequest<{ Body: { email: string; password: string }; Reply: unknown }>,
      reply: FastifyReply,
    ) => {
      const ip = req.ip
      const rlKey = `reg:${ip}`
      if (!core.rateLimit.rateLimit(rlKey, { capacity: 5, refillPerSec: 0.2 }))
        return reply.code(429).send({ error: 'rate_limited' })

      const ok = core.csrf.validateDoubleSubmit({
        cookieToken: req.cookies?.__keyloom_csrf ?? null,
        headerToken: req.headers['x-keyloom-csrf'] as string,
      })
      if (!ok) return reply.code(403).send({ error: 'csrf' })

      const { email, password } = req.body ?? {
        email: undefined as unknown as string,
        password: undefined as unknown as string,
      }
      const out = await core.register(
        { email, password, requireEmailVerify: false },
        { adapter, hasher },
      )
      return {
        userId: out.user.id,
        requiresVerification: out.requiresVerification,
      }
    },
  )

  app.post(
    '/v1/auth/login',
    async (
      req: FastifyRequest<{ Body: { email: string; password: string }; Reply: unknown }>,
      reply: FastifyReply,
    ) => {
      const ip = req.ip
      const rlKey = `login:${ip}`
      if (!core.rateLimit.rateLimit(rlKey, { capacity: 10, refillPerSec: 1 }))
        return reply.code(429).send({ error: 'rate_limited' })

      const ok = core.csrf.validateDoubleSubmit({
        cookieToken: req.cookies?.__keyloom_csrf ?? null,
        headerToken: req.headers['x-keyloom-csrf'] as string,
      })
      if (!ok) return reply.code(403).send({ error: 'csrf' })

      const { email, password } = req.body ?? {
        email: undefined as unknown as string,
        password: undefined as unknown as string,
      }

      if (env.SESSION_STRATEGY === 'jwt') {
        // JWT strategy - issue tokens
        const { user } = await core.login({ email, password }, { adapter, hasher })
        const jwtSvc = getJwtService()
        const tokens = await jwtSvc.issueTokens(user.id, {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })

        const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
        setJwtCookies(reply, tokens, {
          accessTTLSec: tokens.accessTTLSec,
          refreshTTLSec: tokens.refreshTTLSec
        }, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        })

        return {
          accessToken: tokens.accessToken,
          userId: user.id
        }
      } else {
        // Database strategy - create session
        const { session } = await core.login({ email, password }, { adapter, hasher })
        const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
        setSessionCookie(reply, session.id, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        })
        return { sessionId: session.id }
      }
    },
  )

  // JWT token refresh endpoint
  app.post('/v1/auth/token', async (req: FastifyRequest, reply: FastifyReply) => {
    if (env.SESSION_STRATEGY !== 'jwt') {
      return reply.code(404).send({ error: 'endpoint_not_available' })
    }

    try {
      const refreshToken = extractRefreshToken(req.headers.cookie, req.body as any)
      if (!refreshToken) {
        return reply.code(401).send({ error: 'refresh_token_required' })
      }

      const jwtSvc = getJwtService()
      const tokens = await jwtSvc.refreshTokens(refreshToken, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      })

      const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
      setJwtCookies(reply, tokens, {
        accessTTLSec: tokens.accessTTLSec,
        refreshTTLSec: tokens.refreshTTLSec
      }, {
        ...cookieOpts,
        sameSite: env.COOKIE_SAMESITE,
      })

      return {
        accessToken: tokens.accessToken,
        userId: tokens.userId
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
      clearJwtCookies(reply, {
        ...cookieOpts,
        sameSite: env.COOKIE_SAMESITE,
      })
      return reply.code(401).send({ error: 'invalid_refresh_token' })
    }
  })

  app.post('/v1/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    if (env.SESSION_STRATEGY === 'jwt') {
      // JWT strategy - clear cookies and optionally revoke refresh tokens
      const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
      clearJwtCookies(reply, {
        ...cookieOpts,
        sameSite: env.COOKIE_SAMESITE,
      })
      return { ok: true }
    } else {
      // Database strategy - delete session
      const cookie = (req.headers.cookie ?? '')
        .split('; ')
        .find((s) => s.startsWith('__keyloom_session='))
      const sid = cookie?.split('=')[1] ?? null
      if (sid) await core.logout(sid, adapter)
      const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
      clearSessionCookie(reply, {
        ...cookieOpts,
        sameSite: env.COOKIE_SAMESITE,
      })
      return { ok: true }
    }
  })

  app.get('/v1/auth/session', async (req: FastifyRequest, reply: FastifyReply) => {
    if (env.SESSION_STRATEGY === 'jwt') {
      // JWT strategy - verify access token
      try {
        const { extractAccessToken } = await import('../jwt-cookies')
        const { verifyJwtFull, getPublicKeysForVerification } = await import('@keyloom/core/jwt')
        const { getKeystoreManager } = await import('../keystore')

        const accessToken = extractAccessToken(req.headers.authorization, req.headers.cookie)
        if (!accessToken) {
          return { session: null, user: null }
        }

        const keystoreManager = getKeystoreManager()
        const keystore = keystoreManager.getKeystore()
        const publicKeys = getPublicKeysForVerification(keystore)

        const { claims } = await verifyJwtFull(accessToken, publicKeys, {
          expectedIssuer: env.JWT_ISSUER,
          expectedAudience: env.JWT_AUDIENCE,
          clockSkewSec: env.JWT_CLOCK_SKEW_SEC
        })

        // Get user from database
        const user = await adapter.getUser(claims.sub)
        if (!user) {
          return { session: null, user: null }
        }

        return {
          session: {
            id: claims.sid || claims.sub,
            userId: claims.sub,
            expiresAt: new Date(claims.exp * 1000)
          },
          user: { id: user.id, email: user.email }
        }
      } catch (error) {
        console.error('JWT verification error:', error)
        return { session: null, user: null }
      }
    } else {
      // Database strategy - check session
      const cookie = (req.headers.cookie ?? '')
        .split('; ')
        .find((s) => s.startsWith('__keyloom_session='))
      const sid = cookie?.split('=')[1] ?? null
      const { session, user } = await core.getCurrentSession(sid, adapter)
      return { session, user: user ? { id: user.id, email: user.email } : null }
    }
  })

  return app
}
