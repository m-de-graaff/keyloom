import type { Adapter } from '../adapter'
import type { Session } from '../types'

export async function getCurrentSession(cookieValue: string | null, adapter: Adapter) {
  if (!cookieValue) return { session: null as Session | null, user: null }
  const sess = await adapter.getSession(cookieValue)
  if (!sess) return { session: null as Session | null, user: null }
  const user = await adapter.getUser(sess.userId)
  return { session: sess as Session, user }
}
