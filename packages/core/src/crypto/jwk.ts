/* c8 ignore file */
export type JwkKey = {
  kid: string
  kty: 'OKP' | 'EC' | 'RSA'
  crv?: 'Ed25519' | 'P-256'
  alg?: 'EdDSA' | 'ES256' | 'PS256'
  use?: 'sig'
  x?: string
  y?: string
  n?: string
  e?: string
  d?: string // private parts optional
  createdAt: string
  expiresAt?: string
  rotatedAt?: string
}

export type Jwks = { keys: JwkKey[] }

export type KeyRotationPolicy = {
  rotationDays: number // 30-90 typical
  overlapDays: number // keep previous key active for validation
}
