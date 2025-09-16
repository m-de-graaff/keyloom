export type JwtHeader = { alg: 'EdDSA' | 'ES256' | 'PS256'; kid: string; typ: 'JWT' }
export type JwtClaims = {
  iss: string
  aud?: string | string[]
  sub: string
  iat: number
  exp: number
  [k: string]: unknown
}

export interface JwtSigner {
  sign(claims: JwtClaims): Promise<string>
  verify(token: string): Promise<JwtClaims>
  exportPublicJwks(): Promise<{
    keys: Array<Pick<import('./jwk').JwkKey, 'kty' | 'crv' | 'alg' | 'kid' | 'x' | 'y' | 'n' | 'e'>>
  }>
}

export const notImplementedSigner: JwtSigner = {
  async sign() {
    throw new Error('JWT signer not implemented (Phase 8)')
  },
  async verify() {
    throw new Error('JWT verifier not implemented (Phase 8)')
  },
  async exportPublicJwks() {
    return { keys: [] }
  },
}
