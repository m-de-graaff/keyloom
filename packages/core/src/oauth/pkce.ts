import { randBytes } from '../crypto/random'

const enc = (u: Uint8Array) => Buffer.from(u).toString('base64url')

export async function createPkce() {
  const verifier = enc(randBytes(32))
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = enc(new Uint8Array(digest))
  return { verifier, challenge, method: 'S256' as const }
}

