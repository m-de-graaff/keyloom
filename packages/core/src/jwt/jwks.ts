import { generateKeyPair } from './jwk'
import type { JwtAlg, Keystore, RotationPolicy } from './types'

/**
 * Create a new keystore with an initial active key
 */
export async function createKeystore(alg: JwtAlg): Promise<Keystore> {
  const { kid, publicJwk, privateJwk } = await generateKeyPair(alg)

  return {
    active: {
      kid,
      privateJwk,
      publicJwk,
      createdAt: new Date().toISOString(),
    },
    previous: [],
  }
}

/**
 * Export public JWKS from keystore
 */
export function exportPublicJwks(keystore: Keystore): { keys: JsonWebKey[] } {
  const keys = [keystore.active.publicJwk, ...keystore.previous.map((prev) => prev.publicJwk)]

  return { keys }
}

/**
 * Check if keystore needs rotation based on policy
 */
export function needsRotation(keystore: Keystore, policy: RotationPolicy): boolean {
  const activeCreatedAt = new Date(keystore.active.createdAt)
  const rotationThreshold = new Date(Date.now() - policy.rotationDays * 24 * 60 * 60 * 1000)

  return activeCreatedAt < rotationThreshold
}

/**
 * Rotate keystore - generate new active key and move current to previous
 */
export async function rotateKeystore(
  keystore: Keystore,
  alg: JwtAlg,
  policy: RotationPolicy,
): Promise<Keystore> {
  // Generate new active key
  const { kid, publicJwk, privateJwk } = await generateKeyPair(alg)

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + policy.overlapDays * 24 * 60 * 60 * 1000).toISOString()

  // Move current active key to previous
  const newPrevious = [
    {
      kid: keystore.active.kid,
      publicJwk: keystore.active.publicJwk,
      retiredAt: now,
      expiresAt,
    },
    ...keystore.previous,
  ]

  // Clean up expired previous keys
  const validPrevious = newPrevious.filter((prev) => new Date(prev.expiresAt) > new Date())

  return {
    active: {
      kid,
      privateJwk,
      publicJwk,
      createdAt: now,
    },
    previous: validPrevious,
  }
}

/**
 * Clean up expired keys from keystore
 */
export function cleanupExpiredKeys(keystore: Keystore): Keystore {
  const now = new Date()
  const validPrevious = keystore.previous.filter((prev) => new Date(prev.expiresAt) > now)

  return {
    ...keystore,
    previous: validPrevious,
  }
}

/**
 * Find a key in the keystore by kid
 */
export function findKeyInKeystore(
  keystore: Keystore,
  kid: string,
): { publicJwk: JsonWebKey; privateJwk?: JsonWebKey } | null {
  // Check active key
  if (keystore.active.kid === kid) {
    return {
      publicJwk: keystore.active.publicJwk,
      privateJwk: keystore.active.privateJwk,
    }
  }

  // Check previous keys (only public keys available)
  const previousKey = keystore.previous.find((prev) => prev.kid === kid)
  if (previousKey) {
    return {
      publicJwk: previousKey.publicJwk,
    }
  }

  return null
}

/**
 * Get all public keys from keystore for verification
 */
export function getPublicKeysForVerification(keystore: Keystore): JsonWebKey[] {
  return [keystore.active.publicJwk, ...keystore.previous.map((prev) => prev.publicJwk)]
}

/**
 * Validate keystore structure
 */
export function validateKeystore(keystore: unknown): keystore is Keystore {
  if (!keystore || typeof keystore !== 'object') {
    return false
  }

  const ks = keystore as any

  return (
    ks.active &&
    typeof ks.active.kid === 'string' &&
    typeof ks.active.createdAt === 'string' &&
    ks.active.publicJwk &&
    ks.active.privateJwk &&
    Array.isArray(ks.previous)
  )
}

/**
 * Create default rotation policy
 */
export function createDefaultRotationPolicy(): RotationPolicy {
  return {
    rotationDays: 90, // Rotate every 90 days
    overlapDays: 7, // Keep previous key valid for 7 days
  }
}
