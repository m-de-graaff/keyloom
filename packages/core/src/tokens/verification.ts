import { randToken } from '../crypto/random'
import type { VerificationToken } from '../types'
import { now } from '../util/time'

export function issueVerificationToken(identifier: string, ttlMinutes = 15) {
  const token = randToken(32)
  const vt: Omit<VerificationToken, 'id'> = {
    identifier,
    token, // NOTE: store hashed in adapter impl (Phase 2)
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    createdAt: now(),
  }
  return vt
}
