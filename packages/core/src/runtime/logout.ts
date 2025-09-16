import type { Adapter } from '../adapter'

export async function logout(sessionId: string, adapter: Adapter) {
  await adapter.deleteSession(sessionId)
}
