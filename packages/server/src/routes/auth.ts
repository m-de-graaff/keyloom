import prismaAdapter from '@keyloom/adapters/prisma'
import * as core from '@keyloom/core'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
declare module 'fastify' {
  interface FastifyRequest {
    cookies?: { __keyloom_csrf?: string }
  }
}
import { clearSessionCookie, setSessionCookie } from '../cookies'

export function buildServer(env: {
  DATABASE_URL: string
  AUTH_SECRET: string
  COOKIE_DOMAIN?: string | undefined
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none'
}) {
  const app = Fastify({ trustProxy: true })
  const adapter = prismaAdapter()
  const hasher = core.argon2idHasher

  app.get('/v1/auth/csrf', async (_req, reply) => {
  const t = core.csrf.issueCsrfToken()
    reply.header('Set-Cookie', `__keyloom_csrf=${t}; Path=/; SameSite=Lax; HttpOnly; Secure`)
    return { csrfToken: t }
  })

  app.post('/v1/auth/register', async (
    req: FastifyRequest<{ Body: { email: string; password: string }; Reply: unknown }>,
    reply: FastifyReply,
  ) => {
    const ip = req.ip
    const rlKey = `reg:${ip}`
  if (!core.rateLimit.rateLimit(rlKey, { capacity: 5, refillPerSec: 0.2 }))
      return reply.code(429).send({ error: 'rate_limited' })

  const ok = core.csrf.validateDoubleSubmit({
      cookieToken: (req.cookies?.__keyloom_csrf ?? null),
      headerToken: req.headers['x-keyloom-csrf'] as string,
    })
    if (!ok) return reply.code(403).send({ error: 'csrf' })

  const { email, password } = req.body ?? { email: undefined as unknown as string, password: undefined as unknown as string }
  const out = await core.register(
      { email, password, requireEmailVerify: false },
      { adapter, hasher },
    )
    return {
      userId: out.user.id,
      requiresVerification: out.requiresVerification,
    }
  })

  app.post('/v1/auth/login', async (
    req: FastifyRequest<{ Body: { email: string; password: string }; Reply: unknown }>,
    reply: FastifyReply,
  ) => {
    const ip = req.ip
    const rlKey = `login:${ip}`
  if (!core.rateLimit.rateLimit(rlKey, { capacity: 10, refillPerSec: 1 }))
      return reply.code(429).send({ error: 'rate_limited' })

  const ok = core.csrf.validateDoubleSubmit({
      cookieToken: (req.cookies?.__keyloom_csrf ?? null),
      headerToken: req.headers['x-keyloom-csrf'] as string,
    })
    if (!ok) return reply.code(403).send({ error: 'csrf' })

    const { email, password } = req.body ?? { email: undefined as unknown as string, password: undefined as unknown as string }
    const { session } = await core.login({ email, password }, { adapter, hasher })
    const cookieOpts = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
    setSessionCookie(reply, session.id, {
      ...cookieOpts,
      sameSite: env.COOKIE_SAMESITE,
    })
    return { sessionId: session.id }
  })

  app.post('/v1/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
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
  })

  app.get('/v1/auth/session', async (req: FastifyRequest) => {
    const cookie = (req.headers.cookie ?? '')
      .split('; ')
      .find((s) => s.startsWith('__keyloom_session='))
    const sid = cookie?.split('=')[1] ?? null
  const { session, user } = await core.getCurrentSession(sid, adapter)
    return { session, user: user ? { id: user.id, email: user.email } : null }
  })

  return app
}
