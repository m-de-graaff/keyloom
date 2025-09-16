export type JwtAlg = 'EdDSA' | 'ES256'

export type JwtHeader = {
  alg: JwtAlg
  kid: string
  typ: 'JWT'
}

export type JwtClaims = {
  iss: string
  aud?: string | string[]
  sub: string
  iat: number
  exp: number
  sid?: string // short stable session/device id if you keep one
  org?: string // optional (config-gated)
  role?: string // optional (config-gated)
  [k: string]: unknown
}

export type RefreshTokenRecord = {
  familyId: string
  jti: string
  userId: string
  tokenHash: string
  expiresAt: Date
  parentJti?: string | null
  sessionId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export type JwtConfig = {
  alg: JwtAlg
  issuer: string
  audience?: string | string[]
  accessTTL: string // e.g., '10m', '15m'
  refreshTTL: string // e.g., '30d', '7d'
  clockSkewSec: number
  includeOrgRoleInAccess: boolean
}

export type Keystore = {
  active: {
    kid: string
    privateJwk: JsonWebKey
    publicJwk: JsonWebKey
    createdAt: string
  }
  previous: Array<{
    kid: string
    publicJwk: JsonWebKey
    retiredAt: string
    expiresAt: string
  }>
}

export type RotationPolicy = {
  rotationDays: number
  overlapDays: number
}

export type JwtTokenPair = {
  accessToken: string
  refreshToken: string
}

export type AccessTokenClaims = JwtClaims & {
  sid?: string
  org?: string
  role?: string
}

export type RefreshTokenData = {
  token: string
  record: RefreshTokenRecord
}
