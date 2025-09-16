import {
  createRefreshToken,
  importPrivateKey,
  type JwtConfig,
  newAccessClaims,
  parseDurationToSeconds,
  RefreshTokenRotator,
  type RefreshTokenStore,
  signJwtWithKey,
} from '@keyloom/core/jwt'
import type { Env } from './env'
import { getKeystoreManager } from './keystore'

/**
 * JWT service for token operations
 */
export class JwtService {
  private config: JwtConfig
  private rotator: RefreshTokenRotator
  private env: Env

  constructor(env: Env, refreshTokenStore: RefreshTokenStore) {
    this.env = env
    this.config = {
      alg: env.JWT_ALGORITHM,
      issuer: env.JWT_ISSUER,
      accessTTL: env.JWT_ACCESS_TTL,
      refreshTTL: env.JWT_REFRESH_TTL,
      clockSkewSec: env.JWT_CLOCK_SKEW_SEC,
      includeOrgRoleInAccess: env.JWT_INCLUDE_ORG_ROLE,
    }
    if (env.JWT_AUDIENCE) this.config = { ...this.config, audience: env.JWT_AUDIENCE }
    this.rotator = new RefreshTokenRotator(refreshTokenStore, env.AUTH_SECRET)
  }

  /**
   * Issue access and refresh tokens for a user
   */
  async issueTokens(
    userId: string,
    metadata: {
      sessionId?: string
      org?: string
      role?: string
      ip?: string
      userAgent?: string
    } = {},
  ): Promise<{
    accessToken: string
    refreshToken: string
    accessTTLSec: number
    refreshTTLSec: number
  }> {
    const keystoreManager = getKeystoreManager()
    const activeKey = keystoreManager.getActiveKey()

    // Import the private key for signing
    const privateKey = await importPrivateKey(activeKey.privateJwk, this.config.alg)

    // Create access token claims
    const accessTTLSec = parseDurationToSeconds(this.config.accessTTL)
    const accessClaimsInput: {
      sub: string
      sid?: string
      org?: string
      role?: string
      iss: string
      aud?: string | string[]
      ttlSec: number
    } = {
      sub: userId,
      iss: this.config.issuer,
      ttlSec: accessTTLSec,
    }
    if (metadata.sessionId) accessClaimsInput.sid = metadata.sessionId
    if (this.config.includeOrgRoleInAccess && metadata.org) accessClaimsInput.org = metadata.org
    if (this.config.includeOrgRoleInAccess && metadata.role) accessClaimsInput.role = metadata.role
    if (this.config.audience) accessClaimsInput.aud = this.config.audience
    const claims = newAccessClaims(accessClaimsInput)

    // Sign the access token
    const accessToken = await signJwtWithKey(claims, privateKey, activeKey.kid, this.config.alg)

    // Create refresh token
    const refreshTTLMs = parseDurationToSeconds(this.config.refreshTTL) * 1000
    const meta: { sessionId?: string; ip?: string; userAgent?: string } = {}
    if (metadata.sessionId) meta.sessionId = metadata.sessionId
    if (metadata.ip) meta.ip = metadata.ip
    if (metadata.userAgent) meta.userAgent = metadata.userAgent
    const { token: refreshToken } = await createRefreshToken(
      userId,
      this.env.AUTH_SECRET,
      refreshTTLMs,
      meta,
    )

    return {
      accessToken,
      refreshToken,
      accessTTLSec,
      refreshTTLSec: Math.floor(refreshTTLMs / 1000),
    }
  }

  /**
   * Refresh tokens using a refresh token
   */
  async refreshTokens(
    refreshToken: string,
    metadata: {
      ip?: string
      userAgent?: string
      sessionId?: string
    } = {},
  ): Promise<{
    accessToken: string
    refreshToken: string
    accessTTLSec: number
    refreshTTLSec: number
    userId: string
  }> {
    const refreshTTLMs = parseDurationToSeconds(this.config.refreshTTL) * 1000

    // Rotate the refresh token
    const { newToken, userId } = await this.rotator.rotate(refreshToken, refreshTTLMs, metadata)

    // Issue new access token
    const keystoreManager = getKeystoreManager()
    const activeKey = keystoreManager.getActiveKey()
    const privateKey = await importPrivateKey(activeKey.privateJwk, this.config.alg)

    const accessTTLSec = parseDurationToSeconds(this.config.accessTTL)
    const refreshClaimsInput: {
      sub: string
      sid?: string
      iss: string
      aud?: string | string[]
      ttlSec: number
    } = {
      sub: userId,
      iss: this.config.issuer,
      ttlSec: accessTTLSec,
    }
    if (metadata.sessionId) refreshClaimsInput.sid = metadata.sessionId
    if (this.config.audience) refreshClaimsInput.aud = this.config.audience
    const claims = newAccessClaims(refreshClaimsInput)

    const accessToken = await signJwtWithKey(claims, privateKey, activeKey.kid, this.config.alg)

    return {
      accessToken,
      refreshToken: newToken,
      accessTTLSec,
      refreshTTLSec: Math.floor(refreshTTLMs / 1000),
      userId,
    }
  }

  /**
   * Revoke a refresh token family
   */
  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.rotator.revokeFamily(familyId)
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.rotator.cleanup()
  }

  /**
   * Get JWT configuration
   */
  getConfig(): JwtConfig {
    return { ...this.config }
  }

  /**
   * Get TTL values in seconds
   */
  getTTLSeconds(): { accessTTLSec: number; refreshTTLSec: number } {
    return {
      accessTTLSec: parseDurationToSeconds(this.config.accessTTL),
      refreshTTLSec: parseDurationToSeconds(this.config.refreshTTL),
    }
  }
}

/**
 * Global JWT service instance
 */
let globalJwtService: JwtService | null = null

/**
 * Initialize the global JWT service
 */
export function initializeJwtService(env: Env, refreshTokenStore: RefreshTokenStore): JwtService {
  globalJwtService = new JwtService(env, refreshTokenStore)
  return globalJwtService
}

/**
 * Get the global JWT service
 */
export function getJwtService(): JwtService {
  if (!globalJwtService) {
    throw new Error('JWT service not initialized. Call initializeJwtService() first.')
  }
  return globalJwtService
}
