import { DEFAULT_SESSION_TTL_MINUTES } from '../constants'
import type { ID, Session } from '../types'
import { minutesFromNow } from '../util/time'

export function newSession(
  userId: ID,
  ttlMinutes = DEFAULT_SESSION_TTL_MINUTES,
): Omit<Session, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    expiresAt: minutesFromNow(ttlMinutes),
  } as Session
}
