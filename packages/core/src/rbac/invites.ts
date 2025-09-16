import { randToken } from '../crypto/random'
import { tokenHash } from '../crypto/token-hash'

export async function issueInviteToken(
  email: string,
  orgId: string,
  role: string,
  secret: string,
  ttlMinutes = 60 * 24 * 7,
) {
  const token = randToken(32)
  const hash = await tokenHash(token, secret)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  return { token, tokenHash: hash, expiresAt }
}

