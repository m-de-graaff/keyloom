import type { Adapter } from '../adapter'
import { ERR, KeyloomError } from '../errors'
import { newSession } from '../session/model'
import type { ID } from '../types'

export type LoginInput = { email: string; password: string; ttlMinutes?: number }
export type LoginCtx = {
  adapter: Adapter & {
    getCredentialByUserId(userId: ID): Promise<{ hash: string } | null>
  }
  hasher: { verify(hash: string, pw: string): Promise<boolean> }
}

export async function login(input: LoginInput, ctx: LoginCtx) {
  const user = await ctx.adapter.getUserByEmail(input.email)
  if (!user) throw new KeyloomError(ERR.USER_NOT_FOUND)
  const cred = await ctx.adapter.getCredentialByUserId(user.id)
  if (!cred) throw new KeyloomError('CREDENTIAL_NOT_FOUND', 'No credentials for user')
  const ok = await ctx.hasher.verify(cred.hash, input.password)
  if (!ok) throw new KeyloomError('INVALID_CREDENTIALS', 'Invalid email or password')

  const sess = await ctx.adapter.createSession(newSession(user.id, input.ttlMinutes))
  return { user, session: sess }
}
