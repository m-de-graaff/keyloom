import { PrismaAdapter } from '@keyloom/adapters/prisma'
import { getCurrentSession } from '@keyloom/core/runtime/current-session'
import { tokenHash } from '@keyloom/core/crypto/token-hash'
import * as Prisma from '@prisma/client'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'

export function buildOrgsServer(env: { AUTH_SECRET: string }) {
  const app = Fastify({ trustProxy: true })
  const db = new (Prisma as any).PrismaClient()
  const adapter: any = PrismaAdapter(db) as any

  async function issueInviteTokenLocal(
    _email: string,
    _orgId: string,
    _role: string,
    secret: string,
    ttlMinutes = 60 * 24 * 7,
  ) {
    const { randomBytes } = await import('node:crypto')
    const token = randomBytes(32).toString('base64url')
    const hash = await tokenHash(token, secret)
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
    return { token, tokenHash: hash, expiresAt }
  }

  async function getUser(req: FastifyRequest) {
    const cookie = (req.headers.cookie ?? '')
      .split('; ')
      .find((s) => s.startsWith('__keyloom_session='))
    const sid = cookie?.split('=')[1] ?? null
    const { user } = await getCurrentSession(sid, adapter)
    return user
  }

  // Create org (auth required); creator becomes owner
  app.post(
    '/v1/orgs',
    async (
      req: FastifyRequest<{ Body: { name: string; slug?: string | null } }>,
      reply: FastifyReply,
    ) => {
      const user = await getUser(req)
      if (!user) return reply.code(401).send({ error: 'unauthorized' })
      const org = await (adapter as any).createOrganization({
        name: req.body.name,
        slug: req.body.slug ?? null,
      })
      await (adapter as any).addMember({
        userId: user.id,
        orgId: org.id,
        role: 'owner',
      })
      return org
    },
  )

  // List orgs for current user
  app.get('/v1/orgs', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await getUser(req)
    if (!user) return reply.code(401).send({ error: 'unauthorized' })
    const orgs = await (adapter as any).getOrganizationsByUser(user.id)
    return orgs
  })

  // Add member (simple variant: add by userId)
  app.post(
    '/v1/orgs/:id/members',
    async (
      req: FastifyRequest<{
        Params: { id: string }
        Body: { userId?: string; email?: string; role: string }
      }>,
      reply: FastifyReply,
    ) => {
      const user = await getUser(req)
      if (!user) return reply.code(401).send({ error: 'unauthorized' })
      const { id: orgId } = req.params
      const m = await (adapter as any).getMembership(user.id, orgId)
      if (!m || !['owner', 'admin'].includes(m.role))
        return reply.code(403).send({ error: 'forbidden' })

      if (req.body.userId) {
        const mm = await (adapter as any).addMember({
          userId: req.body.userId,
          orgId,
          role: req.body.role,
        })
        return mm
      }
      if (req.body.email) {
        // create invite token
        const { token, tokenHash, expiresAt } = await issueInviteTokenLocal(
          req.body.email,
          orgId,
          req.body.role,
          env.AUTH_SECRET,
        )
        const inv = await (adapter as any).createInvite({
          orgId,
          email: req.body.email,
          role: req.body.role,
          tokenHash,
          expiresAt,
        })
        // For dev: return the raw token to construct a link
        return { inviteId: inv.id, token }
      }
      return reply.code(400).send({ error: 'bad_request' })
    },
  )

  // Remove member
  app.delete(
    '/v1/orgs/:id/members/:memberId',
    async (
      req: FastifyRequest<{ Params: { id: string; memberId: string } }>,
      reply: FastifyReply,
    ) => {
      const user = await getUser(req)
      if (!user) return reply.code(401).send({ error: 'unauthorized' })
      const { id: orgId, memberId } = req.params
      const m = await (adapter as any).getMembership(user.id, orgId)
      if (!m || !['owner', 'admin'].includes(m.role))
        return reply.code(403).send({ error: 'forbidden' })
      await (adapter as any).removeMember(memberId)
      return { ok: true }
    },
  )

  // Accept invite
  app.post(
    '/v1/invites/accept',
    async (
      req: FastifyRequest<{ Body: { orgId: string; token: string } }>,
      reply: FastifyReply,
    ) => {
      const user = await getUser(req)
      if (!user) return reply.code(401).send({ error: 'unauthorized' })
      const { orgId, token } = req.body
      const hash = await tokenHash(token, env.AUTH_SECRET)
      const inv = await (adapter as any).getInviteByTokenHash(orgId, hash)
      if (!inv || inv.expiresAt < new Date())
        return reply.code(400).send({ error: 'invalid_token' })
      await (adapter as any).consumeInvite(inv.id)
      await (adapter as any).addMember({
        userId: user.id,
        orgId,
        role: inv.role,
      })
      return { ok: true }
    },
  )

  return app
}
