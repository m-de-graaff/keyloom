import { randomBytes } from 'node:crypto'

export function genSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function genJWKS() {
  // Placeholder: keep API stable; real impl would use @panva/jose
  const kid = randomBytes(8).toString('hex')
  const jwkPrivate = { kty: 'OKP', crv: 'Ed25519', d: '<private>', x: '<public>', kid }
  const jwkPublic = { kty: 'OKP', crv: 'Ed25519', x: '<public>', kid }
  return { privateJwks: { keys: [jwkPrivate] }, publicJwks: { keys: [jwkPublic] } }
}
