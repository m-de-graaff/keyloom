import { tokenHash } from '../crypto/token-hash'
import { createOpaqueRefreshToken, newFamilyId, newJti, parseOpaqueRefreshToken } from './family'
import type { RefreshTokenData, RefreshTokenRecord } from './types'

/**
 * Issue a new refresh token
 */
export function issueRefreshToken(
  userId: string,
  _secret: string,
  familyId = newFamilyId(),
  parentJti?: string,
): RefreshTokenData {
  const jti = newJti()
  const token = createOpaqueRefreshToken(familyId, jti)

  return {
    token,
    record: {
      familyId,
      jti,
      userId,
      tokenHash: '', // Will be set by the caller after hashing
      expiresAt: new Date(), // Will be set by the caller
      parentJti: parentJti || null,
      sessionId: null,
      ip: null,
      userAgent: null,
    },
  }
}

/**
 * Hash a refresh token for storage
 */
export async function hashRefreshToken(token: string, secret: string): Promise<string> {
  return tokenHash(token, secret)
}

/**
 * Create a complete refresh token with hash and expiration
 */
export async function createRefreshToken(
  userId: string,
  secret: string,
  ttlMs: number,
  options: {
    familyId?: string
    parentJti?: string
    sessionId?: string
    ip?: string
    userAgent?: string
  } = {},
): Promise<RefreshTokenData> {
  const { familyId, parentJti, sessionId, ip, userAgent } = options

  const { token, record } = issueRefreshToken(userId, secret, familyId, parentJti)

  // Hash the token for storage
  const hash = await hashRefreshToken(token, secret)

  // Set expiration and metadata
  const completeRecord: RefreshTokenRecord = {
    ...record,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + ttlMs),
    sessionId: sessionId || null,
    ip: ip || null,
    userAgent: userAgent || null,
  }

  return {
    token,
    record: completeRecord,
  }
}

/**
 * Validate refresh token format and extract components
 */
export function validateRefreshTokenFormat(token: string): {
  familyId: string
  jti: string
  randomPart: string
} | null {
  return parseOpaqueRefreshToken(token)
}

/**
 * Check if a refresh token is expired
 */
export function isRefreshTokenExpired(record: RefreshTokenRecord): boolean {
  return record.expiresAt < new Date()
}

/**
 * Refresh token store interface
 * This defines the operations needed for refresh token management
 */
export interface RefreshTokenStore {
  /**
   * Save a refresh token record
   */
  save(record: RefreshTokenRecord): Promise<void>

  /**
   * Find a refresh token by its hash
   */
  findByHash(hash: string): Promise<RefreshTokenRecord | null>

  /**
   * Mark a refresh token as rotated (used)
   */
  markRotated(jti: string): Promise<void>

  /**
   * Revoke an entire token family (for reuse detection)
   */
  revokeFamily(familyId: string): Promise<void>

  /**
   * Create a child token in the rotation chain
   */
  createChild(parentRecord: RefreshTokenRecord, childRecord: RefreshTokenRecord): Promise<void>

  /**
   * Clean up expired tokens
   */
  cleanupExpired(before?: Date): Promise<number>

  /**
   * Check if a token family is revoked
   */
  isFamilyRevoked(familyId: string): Promise<boolean>

  /**
   * Get all tokens in a family (for debugging/admin)
   */
  getFamily(familyId: string): Promise<RefreshTokenRecord[]>
}

/**
 * Refresh token rotation logic
 */
export class RefreshTokenRotator {
  constructor(
    private store: RefreshTokenStore,
    private secret: string,
  ) {}

  /**
   * Rotate a refresh token - validate current token and issue new one
   */
  async rotate(
    presentedToken: string,
    ttlMs: number,
    metadata: {
      ip?: string
      userAgent?: string
      sessionId?: string
    } = {},
  ): Promise<{
    newToken: string
    record: RefreshTokenRecord
    userId: string
  }> {
    // Hash the presented token
    const hash = await hashRefreshToken(presentedToken, this.secret)

    // Find the token record
    const record = await this.store.findByHash(hash)
    if (!record) {
      throw new Error('Refresh token not found')
    }

    // Check if expired
    if (isRefreshTokenExpired(record)) {
      throw new Error('Refresh token expired')
    }

    // Check if family is revoked
    if (await this.store.isFamilyRevoked(record.familyId)) {
      throw new Error('Refresh token family revoked')
    }

    // Check for reuse detection
    // If this token was already rotated, it's a reuse attempt
    const family = await this.store.getFamily(record.familyId)
    const wasRotated = family.some((token) => token.jti === record.jti && token.parentJti !== null)

    if (wasRotated) {
      // Reuse detected - revoke entire family
      await this.store.revokeFamily(record.familyId)
      throw new Error('Refresh token reuse detected - family revoked')
    }

    // Mark current token as rotated
    await this.store.markRotated(record.jti)

    // Create new token in the same family
    const opts: {
      familyId?: string
      parentJti?: string
      sessionId?: string
      ip?: string
      userAgent?: string
    } = {
      familyId: record.familyId,
      parentJti: record.jti,
    }
    const sessionId = metadata.sessionId ?? record.sessionId ?? undefined
    if (sessionId !== undefined) opts.sessionId = sessionId
    if (metadata.ip !== undefined) opts.ip = metadata.ip
    if (metadata.userAgent !== undefined) opts.userAgent = metadata.userAgent

    const { token: newToken, record: newRecord } = await createRefreshToken(
      record.userId,
      this.secret,
      ttlMs,
      opts,
    )

    // Store the new token
    await this.store.createChild(record, newRecord)

    return {
      newToken,
      record: newRecord,
      userId: record.userId,
    }
  }

  /**
   * Revoke a refresh token family
   */
  async revokeFamily(familyId: string): Promise<void> {
    await this.store.revokeFamily(familyId)
  }

  /**
   * Clean up expired tokens
   */
  async cleanup(before = new Date()): Promise<number> {
    return this.store.cleanupExpired(before)
  }
}
