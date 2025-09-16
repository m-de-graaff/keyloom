import type { Adapter } from '../adapter'
import type { ID } from '../types'

export type RegisterInput = {
  email: string
  password: string
  requireEmailVerify?: boolean
}
export type RegisterCtx = {
  adapter: Adapter & {
    createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>
  }
  hasher: { hash(pw: string): Promise<string> }
  audit?: (type: string, meta?: { userId?: ID } & Record<string, unknown>) => Promise<void>
}

export async function register(input: RegisterInput, ctx: RegisterCtx) {
  const { email, password, requireEmailVerify = false } = input
  const { adapter, hasher } = ctx

  const u = await adapter.createUser({
    email,
    emailVerified: requireEmailVerify ? null : new Date(),
  })
  const hash = await hasher.hash(password)
  await adapter.createCredential(u.id, hash)

  if (ctx.audit) await ctx.audit('user.created', { userId: u.id })

  return { user: u, requiresVerification: requireEmailVerify }
}
